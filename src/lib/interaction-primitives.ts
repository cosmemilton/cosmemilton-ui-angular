import {
  booleanAttribute, ChangeDetectionStrategy, Component, computed, contentChild, contentChildren, Directive,
  effect, ElementRef, forwardRef, inject, input, model, output, signal, viewChild,
} from '@angular/core'
import { CmButton } from './button'
import { CmIcon } from './icon'

let sequence = 0
type TabsVariant = 'default' | 'folder' | 'modal'

@Component({
  selector: 'cm-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'cm-tabs', style: 'display:block' },
  template: '<ng-content />',
})
export class CmTabs {
  readonly value = model('')
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal')
  readonly activation = input<'automatic' | 'manual'>('automatic')
  readonly variant = input<TabsVariant>('default')
  private readonly scope = 'cm-tabs-' + (++sequence)
  private readonly triggers = contentChildren<CmTabsTrigger>(forwardRef(() => CmTabsTrigger), { descendants: true })
  private readonly focused = signal('')
  private readonly available = computed(() => this.triggers().filter(trigger => !trigger.disabled()))

  constructor() {
    effect(() => {
      const choices = this.available()
      if (choices.length && !choices.some(choice => choice.value() === this.value())) {
        this.value.set(choices[0].value())
      }
    })
  }

  triggerId(key: string) { return this.scope + '-trigger-' + encodeURIComponent(key) }
  panelId(key: string) { return this.scope + '-panel-' + encodeURIComponent(key) }
  isTabStop(key: string) {
    const focused = this.focused()
    return (this.available().some(tab => tab.value() === focused) ? focused : this.value()) === key
  }
  select(key: string) { this.focused.set(key); this.value.set(key) }
  focus(key: string) { this.focused.set(key) }

  navigate(event: KeyboardEvent) {
    const available = this.available()
    if (!available.length) return

    const vertical = this.orientation() === 'vertical'
    const dir = available[0].element.closest('[dir]')?.getAttribute('dir') ?? available[0].element.ownerDocument.dir
    const nextKey = vertical ? 'ArrowDown' : dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
    const previousKey = vertical ? 'ArrowUp' : dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
    const current = available.findIndex(tab => tab.element === tab.element.ownerDocument.activeElement)
    const last = available.length - 1
    let next: number
    if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = last
    else if (event.key === nextKey) next = (current + 1) % available.length
    else if (event.key === previousKey) next = current <= 0 ? last : current - 1
    else return

    event.preventDefault()
    const target = available[next]
    target.element.focus()
    this.focus(target.value())
    if (this.activation() === 'automatic') this.select(target.value())
  }
}

@Directive({
  selector: '[cmTabsList]',
  host: {
    role: 'tablist',
    '[class]': 'classes()',
    '[attr.aria-orientation]': 'tabs.orientation()',
    '(keydown)': 'tabs.navigate($event)',
  },
})
export class CmTabsList {
  protected readonly tabs = inject(CmTabs)
  protected readonly classes = computed(() => [
    'cm-tabs-list',
    this.tabs.variant() === 'default' ? '' : 'cm-tabs-list--' + this.tabs.variant(),
    this.tabs.orientation() === 'vertical' ? 'cm-angular-tabs-vertical' : '',
  ].join(' '))
}

@Directive({
  selector: 'button[cmTabsTrigger]',
  host: {
    type: 'button',
    role: 'tab',
    '[class]': 'classes()',
    '[id]': 'tabs.triggerId(value())',
    '[attr.aria-controls]': 'tabs.panelId(value())',
    '[attr.aria-selected]': 'active()',
    '[attr.tabindex]': 'tabs.isTabStop(value()) && !disabled() ? 0 : -1',
    '[disabled]': 'disabled()',
    '(click)': 'activate()',
    '(focus)': 'tabs.focus(value())',
  },
})
export class CmTabsTrigger {
  protected readonly tabs = inject(CmTabs)
  readonly element = inject<ElementRef<HTMLButtonElement>>(ElementRef).nativeElement
  readonly value = input.required<string>({ alias: 'cmTabsTrigger' })
  readonly disabled = input(false, { transform: booleanAttribute })
  protected readonly active = computed(() => this.tabs.value() === this.value())
  protected readonly classes = computed(() => [
    'cm-tabs-trigger',
    this.active() ? 'cm-tabs-trigger-active' : '',
    this.tabs.variant() === 'default' ? '' : 'cm-tabs-trigger--' + this.tabs.variant(),
  ].join(' '))

  protected activate() { if (!this.disabled()) this.tabs.select(this.value()) }
}

@Directive({
  selector: '[cmTabsContent]',
  host: {
    role: 'tabpanel',
    tabindex: '0',
    '[class]': 'classes()',
    '[id]': 'tabs.panelId(value())',
    '[attr.aria-labelledby]': 'tabs.triggerId(value())',
    '[hidden]': 'tabs.value() !== value()',
  },
})
export class CmTabsContent {
  protected readonly tabs = inject(CmTabs)
  readonly value = input.required<string>({ alias: 'cmTabsContent' })
  protected readonly classes = computed(() =>
    'cm-tabs-content' + (this.tabs.variant() === 'default' ? '' : ' cm-tabs-content--' + this.tabs.variant()),
  )
}

@Component({
  selector: 'cm-disclosure',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:block' },
  template: `
    <details #panel class="cm-disclosure" [open]="open()" (toggle)="update(panel.open)">
      <summary class="cm-disclosure__summary">
        <span class="cm-disclosure__title">{{ title() }}</span>
        @if (meta()) { <span class="cm-disclosure__meta">{{ meta() }}</span> }
      </summary>
      <div class="cm-disclosure__content"><ng-content /></div>
    </details>
  `,
})
export class CmDisclosure {
  readonly title = input.required<string>()
  readonly meta = input('')
  readonly open = model(false)

  protected update(value: boolean) { if (this.open() !== value) this.open.set(value) }
}

export type CmAccordionEntry = { id: string; title: string; description: string; meta?: string }

@Component({
  selector: 'cm-accordion',
  imports: [CmDisclosure],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'cm-stack', style: '--cm-layout-gap:var(--space-xs)' },
  template: `
    @for (item of items(); track item.id) {
      <cm-disclosure [title]="item.title" [meta]="item.meta ?? ''" [open]="isExpanded(item.id)"
        (openChange)="update(item.id,$event)">
        <p class="cm-text">{{ item.description }}</p>
      </cm-disclosure>
    }
  `,
})
export class CmAccordion {
  readonly items = input.required<readonly CmAccordionEntry[]>()
  readonly multiple = input(false, { transform: booleanAttribute })
  readonly expanded = model<readonly string[]>([])

  protected isExpanded(id: string) { return this.multiple() ? this.expanded().includes(id) : this.expanded()[0] === id }

  protected update(key: string, active: boolean) {
    this.expanded.update(existing => active
      ? [...(this.multiple() ? existing.filter(item => item !== key) : []), key]
      : existing.filter(item => item !== key))
  }
}

@Directive({ selector: '[cmDialogFooter]' })
export class CmDialogFooter {}

type DialogSize = 'sm' | 'md' | 'lg' | 'xl'
type DialogPlacement = 'center' | 'right' | 'left' | 'bottom' | 'top'

@Component({
  selector: 'cm-dialog',
  imports: [CmButton, CmIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `
    <dialog #popup class="cm-dialog__panel cm-angular-dialog" [attr.data-size]="size()" [attr.data-placement]="placement()"
      [attr.aria-labelledby]="titleId" [attr.aria-describedby]="description() ? descriptionId : null"
      (cancel)="cancel($event)" (click)="backdrop($event,popup)" (close)="nativeClose()">
      <header class="cm-dialog__header">
        <div class="cm-dialog__heading">
          <h2 [id]="titleId" class="cm-dialog__title cm-dialog__title--default">{{ title() }}</h2>
          @if (description()) { <p [id]="descriptionId" class="cm-dialog__description">{{ description() }}</p> }
        </div>
        @if (showClose()) {
          <button cmButton type="button" variant="ghost" iconOnly [attr.aria-label]="closeLabel()" (click)="open.set(false)">
            <cm-icon name="x" [size]="18" />
          </button>
        }
      </header>
      <div class="cm-dialog__body"><ng-content /></div>
      @if (footer()) { <footer class="cm-dialog__footer"><ng-content select="[cmDialogFooter]" /></footer> }
    </dialog>
  `,
})
export class CmDialog {
  readonly title = input.required<string>()
  readonly description = input('')
  readonly open = model(false)
  readonly size = input<DialogSize>('md')
  readonly placement = input<DialogPlacement>('center')
  readonly showClose = input(true, { transform: booleanAttribute })
  readonly closeOnEscape = input(true, { transform: booleanAttribute })
  readonly closeOnBackdrop = input(true, { transform: booleanAttribute })
  readonly closeLabel = input('Fechar')
  readonly closed = output<void>()

  protected readonly titleId = 'cm-dialog-' + (++sequence) + '-title'
  protected readonly descriptionId = this.titleId + '-description'
  protected readonly footer = contentChild(CmDialogFooter, { descendants: true })
  private readonly popup = viewChild<ElementRef<HTMLDialogElement>>('popup')

  constructor() {
    effect(() => {
      const open = this.open()
      const dialog = this.popup()?.nativeElement
      if (!dialog?.isConnected) return
      if (open && !dialog.open) dialog.showModal()
      if (!open && dialog.open) dialog.close()
    })
  }

  protected cancel(event: Event) {
    if (!this.closeOnEscape()) event.preventDefault()
  }

  protected backdrop(event: MouseEvent, dialog: HTMLDialogElement) {
    if (event.target === dialog && this.closeOnBackdrop()) this.open.set(false)
  }

  protected nativeClose() {
    if (this.popup()?.nativeElement.open) return
    this.open.set(false)
    this.closed.emit()
  }
}

@Component({
  selector: 'cm-drawer',
  imports: [CmDialog, CmDialogFooter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `
    <cm-dialog [title]="title()" [description]="description()" [open]="open()" (openChange)="open.set($event)"
      [placement]="side()" [size]="size()" [closeOnBackdrop]="closeOnBackdrop()" [closeOnEscape]="closeOnEscape()"
      (closed)="closed.emit()">
      <ng-content />
      @if (footer()) { <div cmDialogFooter><ng-content select="[cmDialogFooter]" /></div> }
    </cm-dialog>
  `,
})
export class CmDrawer {
  readonly title = input.required<string>()
  readonly description = input('')
  readonly open = model(false)
  readonly side = input<Exclude<DialogPlacement, 'center'>>('right')
  readonly size = input<DialogSize>('md')
  readonly closeOnBackdrop = input(true, { transform: booleanAttribute })
  readonly closeOnEscape = input(true, { transform: booleanAttribute })
  readonly closed = output<void>()
  protected readonly footer = contentChild(CmDialogFooter, { descendants: true })
}
