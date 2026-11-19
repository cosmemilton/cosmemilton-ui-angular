import { DOCUMENT } from '@angular/common'
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, input, output, signal } from '@angular/core'

export type CmDropdownMenuItem = { id: string; label: string; disabled?: boolean }

let sequence = 0

@Component({
  selector: 'cm-dropdown-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'cm-popover__panel cm-dropdown-menu__popover',
    popover: 'auto',
    '(toggle)': 'syncOpen($event)',
    '(window:resize)': 'position()',
  },
  styles: [':host { inset: auto; margin: 0; }'],
  template: `
    <div class="cm-dropdown-menu" role="menu" tabindex="-1" [id]="menuId" [attr.aria-label]="label()" (keydown)="handleKey($event)">
      @for (item of items(); track item.id) {
        <button type="button" class="cm-dropdown-menu__item cm-dropdown-menu__item--default" role="menuitem" tabindex="-1"
          [disabled]="item.disabled ?? false" (click)="selectItem(item.id)"><span class="cm-dropdown-menu__label">{{ item.label }}</span></button>
      }
    </div>
  `,
})
export class CmDropdownMenu {
  readonly items = input.required<readonly CmDropdownMenuItem[]>()
  readonly label = input.required<string>()
  readonly align = input<'start' | 'end'>('end')
  readonly selected = output<string>()
  readonly menuId = 'cm-dropdown-menu-' + (++sequence)
  private readonly document = inject(DOCUMENT)
  private readonly panel = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement
  private readonly openState = signal(false)
  readonly open = this.openState.asReadonly()
  private anchor: HTMLButtonElement | undefined
  private readonly reposition = () => this.position()

  constructor() {
    inject(DestroyRef).onDestroy(() => this.document.removeEventListener('scroll', this.reposition, true))
  }

  toggle(anchor: HTMLButtonElement) {
    if (this.open()) this.close(false)
    else this.show(anchor)
  }

  show(anchor: HTMLButtonElement) {
    if (this.open() || anchor.disabled) return
    this.anchor = anchor
    this.panel.showPopover({ source: anchor })
    this.openState.set(true)
    this.document.addEventListener('scroll', this.reposition, true)
    this.position()
    const first = this.menuItems()[0] ?? this.panel.querySelector<HTMLElement>('[role="menu"]')
    first?.focus({ preventScroll: true })
  }

  protected syncOpen(event: ToggleEvent) {
    if (event.newState === 'open') return
    this.openState.set(false)
    this.document.removeEventListener('scroll', this.reposition, true)
  }

  protected position() {
    const viewport = this.document.defaultView
    if (!this.open() || !this.anchor || !viewport) return
    const target = this.anchor.getBoundingClientRect()
    const menu = this.panel.getBoundingClientRect()
    const offset = 8
    const left = this.align() === 'end' ? target.right - menu.width : target.left
    const top = target.bottom + offset + menu.height <= viewport.innerHeight ? target.bottom + offset : target.top - menu.height - offset
    this.panel.style.left = Math.max(offset, Math.min(left, viewport.innerWidth - menu.width - offset)) + 'px'
    this.panel.style.top = Math.max(offset, top) + 'px'
  }

  protected handleKey(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
      }
      this.close(true)
      return
    }
    const buttons = this.menuItems()
    const current = buttons.findIndex(button => button === event.target)
    const last = buttons.length - 1
    let next: HTMLButtonElement | undefined
    if (event.key === 'Home') next = buttons[0]
    if (event.key === 'End') next = buttons[last]
    if (event.key === 'ArrowUp') next = buttons[current <= 0 ? last : current - 1]
    if (event.key === 'ArrowDown') next = buttons[(current + 1) % buttons.length]
    if (!next) return
    event.preventDefault()
    next.focus({ preventScroll: true })
  }

  protected selectItem(id: string) {
    this.close(true)
    this.selected.emit(id)
  }

  private menuItems() { return Array.from(this.panel.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:enabled')) }

  private close(returnFocus: boolean) {
    this.panel.hidePopover()
    this.openState.set(false)
    if (returnFocus) this.anchor?.focus({ preventScroll: true })
  }
}
