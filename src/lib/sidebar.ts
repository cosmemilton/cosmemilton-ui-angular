import { booleanAttribute, ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core'
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
    .cm-sidebar-shell--collapsed .cm-sidebar__groups { display: contents; }
    .cm-sidebar-shell--collapsed cm-icon.cm-sidebar__brand-icon { justify-content: center; }
  `],
  template: `
    <div class="cm-sidebar-shell cm-sidebar-shell--standalone" [class.cm-sidebar-shell--collapsed]="railOnly()">
      <aside class="cm-sidebar cm-sidebar--tone-surface" data-rail="connectors">
        <div class="cm-sidebar__brand">
          <button class="cm-sidebar__brand-icon-button" [class.cm-sidebar__brand-icon]="!railOnly()" type="button"
            [attr.aria-label]="railOnly() ? 'Abrir menu lateral' : 'Alternar menu lateral'" (click)="toggle()">
            <cm-icon [class.cm-sidebar__brand-icon]="railOnly()" [name]="brandIcon()" [size]="22" />
          </button>
          <div class="cm-sidebar__brand-text"><strong>{{ brand() }}</strong></div>
          <button class="cm-sidebar__toggle" type="button" [attr.aria-label]="mobile() ? 'Fechar menu' : collapsed() ? 'Expandir menu' : 'Recolher menu'" (click)="toggle()">
            <cm-icon [name]="collapsed() ? 'chevron-right' : 'chevron-left'" [size]="15" />
          </button>
        </div>
        <nav class="cm-sidebar__nav" [attr.aria-label]="label()">
          <div class="cm-sidebar__groups">
            @for (group of groups(); track group.id) {
              @if (group.direct && group.items[0]; as item) {
                <a class="cm-sidebar__group-trigger" [class.cm-sidebar__group-trigger--active]="isActive(item.path)"
                  [routerLink]="item.path" [attr.aria-current]="isActive(item.path) ? 'page' : null"
                  [attr.aria-label]="railOnly() ? group.label : null" [attr.title]="railOnly() ? group.label : null" (click)="selected.emit()">
                  @if (group.icon ?? item.icon; as icon) {
                    <cm-icon class="cm-sidebar__icon" [class.cm-sidebar__nav-icon]="railOnly()" [name]="icon" />
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
                      <cm-icon class="cm-sidebar__icon" [class.cm-sidebar__nav-icon]="railOnly()" [name]="group.icon" />
                    } @else if (railOnly()) {
                      <span class="cm-sidebar__nav-icon cm-sidebar__nav-icon--fallback" aria-hidden="true">{{ group.label.charAt(0).toUpperCase() }}</span>
                    }
                    <span class="cm-sidebar__label">{{ group.label }}</span>
                    @if (!railOnly()) { <cm-icon class="cm-sidebar__chevron" name="chevron-right" [size]="16" /> }
                  </button>
                  @if (open() === group.id) {
                    <div class="cm-sidebar__group-items">
                      @for (item of group.items; track item.path) {
                        <a class="cm-sidebar__item" [class.cm-sidebar__item--active]="isActive(item.path)"
                          [routerLink]="item.path" [attr.aria-current]="isActive(item.path) ? 'page' : null" (click)="selected.emit()">
                          @if (item.icon) { <cm-icon class="cm-sidebar__icon" [name]="item.icon" [size]="16" /> }
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
  protected readonly railOnly = computed(() => this.collapsed() && !this.mobile())
  protected readonly open = signal<string | null>(null)
  protected readonly activeGroup = computed(() =>
    this.groups().find(group => group.items.some(item => this.isActive(item.path)))?.id ?? null,
  )

  constructor() {
    effect(() => this.open.set(this.activeGroup() ?? this.groups().find(group => !group.direct)?.id ?? null))
  }

  protected isActive(path: string) { return this.path() === path }

  protected openGroup(id: string) {
    if (this.collapsed()) {
      this.collapsed.set(false)
      this.open.set(id)
      return
    }
    this.open.update(current => current === id ? null : id)
  }

  protected toggle() {
    if (this.mobile()) this.selected.emit()
    else this.collapsed.update(value => !value)
  }
}
