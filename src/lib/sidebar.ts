import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, linkedSignal, output, signal, viewChild } from '@angular/core'
import { RouterLink } from '@angular/router'
import { CmIcon } from './icon'

export type CmNavItem = { path: string; label: string; icon?: string; description?: string }
export type CmNavGroup = { id: string; label: string; icon?: string; items: readonly CmNavItem[]; direct?: boolean }

@Component({
  selector: 'cm-sidebar',
  imports: [RouterLink, CmIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  styles: [`
    .cm-sidebar__groups { display: contents; }
    .cm-sidebar-shell--collapsed cm-icon.cm-sidebar__brand-icon { justify-content: center; }
  `],
  template: `
    <div class="cm-sidebar-shell cm-sidebar-shell--standalone cm-sidebar-shell--tone-surface"
      [class.cm-sidebar-shell--collapsed]="collapsed() && !mobile()" [class.cm-sidebar-shell--preview]="preview() && !mobile()">
      <aside class="cm-sidebar cm-sidebar--tone-surface" data-rail="connectors" [attr.aria-label]="label()"
        (mouseenter)="openPreview()" (mouseleave)="closePreview()" (focusin)="openPreview()" (focusout)="leaveFocus($event)">
        <div class="cm-sidebar__brand">
          @if (collapsed() && !mobile()) {
            <button class="cm-sidebar__brand-icon-button" type="button" aria-label="Abrir menu lateral" title="Abrir menu lateral"
              [attr.aria-expanded]="preview()" (click)="toggle()"><cm-icon class="cm-sidebar__brand-icon" [name]="brandIcon()" [size]="22" /></button>
          } @else {
            <cm-icon class="cm-sidebar__brand-icon" [name]="brandIcon()" [size]="22" />
          }
          <div class="cm-sidebar__brand-text"><strong>{{ brand() }}</strong></div>
          <button #toggleButton class="cm-sidebar__toggle" type="button" [attr.aria-label]="mobile() ? 'Fechar menu' : collapsed() ? 'Expandir menu lateral' : 'Recolher menu lateral'" (click)="toggle()">
            <cm-icon [name]="collapsed() ? 'chevron-right' : 'chevron-left'" [size]="16" />
          </button>
        </div>
        <nav class="cm-sidebar__nav" [attr.aria-label]="label()">
          <div class="cm-sidebar__groups">
            @for (group of groups(); track group.id) {
              @if (group.direct && group.items[0]; as item) {
                <a class="cm-sidebar__group-trigger" [class.cm-sidebar__group-trigger--active]="isActive(item.path)"
                  [routerLink]="item.path" [attr.aria-current]="isActive(item.path) ? 'page' : null"
                  [attr.aria-label]="railOnly() ? group.label : null" [attr.title]="railOnly() ? group.label : null" (click)="selectItem()">
                  @if (group.icon ?? item.icon; as icon) {
                    <cm-icon class="cm-sidebar__nav-icon" [name]="icon" />
                  } @else if (railOnly()) {
                    <span class="cm-sidebar__nav-icon cm-sidebar__nav-icon--fallback" aria-hidden="true">{{ group.label.charAt(0).toUpperCase() }}</span>
                  }
                  <span class="cm-sidebar__label">{{ group.label }}</span>
                </a>
              } @else {
                <div class="cm-sidebar__group" [class.cm-sidebar__group--open]="open() === group.id" [class.cm-sidebar__group--active]="activeGroup() === group.id">
                  <button type="button" class="cm-sidebar__group-trigger" [class.cm-sidebar__group-trigger--active]="activeGroup() === group.id"
                    [attr.aria-expanded]="open() === group.id" [attr.aria-label]="railOnly() ? group.label : null"
                    [attr.title]="railOnly() ? group.label : null" (click)="openGroup(group.id)">
                    @if (group.icon) {
                      <cm-icon class="cm-sidebar__nav-icon" [name]="group.icon" />
                    } @else if (railOnly()) {
                      <span class="cm-sidebar__nav-icon cm-sidebar__nav-icon--fallback" aria-hidden="true">{{ group.label.charAt(0).toUpperCase() }}</span>
                    }
                    <span class="cm-sidebar__label">{{ group.label }}</span>
                    @if (!railOnly()) { <cm-icon class="cm-sidebar__chevron" name="chevron-right" [size]="16" /> }
                  </button>
                  @if (open() === group.id) {
                    <div #groupItems class="cm-sidebar__group-items">
                      @for (item of group.items; track item.path) {
                        <a class="cm-sidebar__item" [class.cm-sidebar__item--active]="isActive(item.path)"
                          [routerLink]="item.path" [attr.aria-current]="isActive(item.path) ? 'page' : null" (click)="selectItem()">
                          @if (item.icon) { <cm-icon class="cm-sidebar__nav-icon" [name]="item.icon" [size]="16" /> }
                          <span class="cm-sidebar__label">{{ item.label }}</span>
                        </a>
                      }
                    </div>
                  }
                </div>
              }
            }
          </div>
        </nav>
        @if (footer()) { <div class="cm-sidebar__footer"><span class="cm-text cm-text--sm cm-text--muted">{{ footer() }}</span></div> }
      </aside>
    </div>
  `,
})
export class CmSidebar {
  readonly groups = input.required<readonly CmNavGroup[]>()
  readonly path = input.required<string>()
  readonly label = input('Menu principal')
  readonly brand = input('Aurora Ops')
  readonly brandIcon = input('activity')
  readonly footer = input('')
  readonly mobile = input(false, { transform: booleanAttribute })
  readonly selected = output<void>()
  readonly collapsed = signal(false)
  protected readonly preview = signal(false)
  protected readonly railOnly = computed(() => this.collapsed() && !this.mobile() && !this.preview())
  protected readonly open = linkedSignal({
    source: this.path,
    computation: path => this.groupForPath(path)?.id ?? this.groups().find(group => !group.direct)?.id ?? null,
  })
  protected readonly activeGroup = computed(() => this.groupForPath(this.path())?.id ?? null)
  private readonly groupItems = viewChild<ElementRef<HTMLElement>>('groupItems')
  private readonly toggleButton = viewChild<ElementRef<HTMLButtonElement>>('toggleButton')
  private previewTimer?: ReturnType<typeof setTimeout>

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.previewTimer))
    afterRenderEffect(onCleanup => {
      this.path() // Seleção também pode mudar mantendo o mesmo grupo aberto.
      const list = this.groupItems()?.nativeElement
      if (!list || this.railOnly()) return
      const active = list.querySelector<HTMLElement>('[aria-current="page"]')
      if (!active) return

      const observer = new ResizeObserver(() => {
        if (!list.clientHeight || list.scrollHeight <= list.clientHeight) return
        const item = active.getBoundingClientRect()
        const bounds = list.getBoundingClientRect()
        if (item.top < bounds.top) list.scrollTop += item.top - bounds.top
        else if (item.bottom > bounds.bottom) list.scrollTop += item.bottom - bounds.bottom
      })
      observer.observe(list)
      onCleanup(() => observer.disconnect())
    })
  }

  protected isActive(path: string) { return this.path() === path }

  private groupForPath(path: string) {
    return this.groups().find(group => !group.direct && group.items.some(item => item.path === path))
  }

  protected openGroup(id: string) {
    this.openPreview()
    this.open.update(current => current === id ? null : id)
  }

  protected openPreview() {
    if (!this.collapsed() || this.mobile()) return
    clearTimeout(this.previewTimer)
    this.preview.set(true)
  }

  protected closePreview(delay = 700) {
    if (!this.collapsed() || this.mobile()) return
    clearTimeout(this.previewTimer)
    this.previewTimer = setTimeout(() => this.preview.set(false), delay)
  }

  protected leaveFocus(event: FocusEvent) {
    const container = event.currentTarget as HTMLElement
    if (!(event.relatedTarget instanceof Node) || !container.contains(event.relatedTarget)) this.closePreview()
  }

  protected selectItem() {
    this.closePreview(1300)
    this.selected.emit()
  }

  protected toggle() {
    if (this.mobile()) { this.selected.emit(); return }
    if (this.collapsed()) this.toggleButton()?.nativeElement.focus({ preventScroll: true })
    clearTimeout(this.previewTimer)
    this.preview.set(false)
    this.collapsed.update(value => !value)
    this.open.set(this.activeGroup() ?? this.groups().find(group => !group.direct)?.id ?? null)
  }
}
