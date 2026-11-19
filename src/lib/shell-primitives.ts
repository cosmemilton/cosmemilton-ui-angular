import { DOCUMENT, NgTemplateOutlet } from '@angular/common'
import { afterNextRender, booleanAttribute, Component, computed, DestroyRef, Directive, effect, ElementRef, inject, input, output, signal, TemplateRef, viewChild } from '@angular/core'
import { CmIcon } from './icon'

type Dimension = string | number

function dimension(value: Dimension | undefined) {
  return typeof value === 'number' ? `${value}px` : value
}

function spacing(value: Dimension | undefined) {
  if (typeof value === 'string' && /^(none|xs|sm|md|lg|xl|2xl|3xl)$/.test(value)) return `var(--space-${value})`
  return dimension(value)
}

function classes(...values: Array<string | boolean | undefined>) { return values.filter(Boolean).join(' ') }

export type CmAppShellControls = {
  closeMobileSidebar(): void
  openMobileSidebar(): void
  toggleMobileSidebar(): void
  mobileSidebarOpen(): boolean
  mobileMenuButton: TemplateRef<unknown> | undefined
}

let shellId = 0

@Component({
  selector: 'cm-app-shell, div[cmAppShell]', imports: [NgTemplateOutlet, CmIcon],
  host: {
    '[class]': 'rootClass()', '[style]': 'rootStyle()', '[attr.data-cm-chrome]': 'chrome()', '[attr.data-density]': 'density()',
    '(keydown)': 'handleKeys($event)',
  },
  template: `
    <ng-template #menuToggle>
      <button type="button" class="cm-app-shell__mobile-menu-button" [attr.aria-label]="mobileMenuLabel()"
        [attr.aria-expanded]="mobileOpen()" [attr.aria-controls]="drawerId" (click)="changeMobile(!mobileOpen())">
        <cm-icon name="menu" [size]="18" />
      </button>
    </ng-template>
    @if (skipLinkLabel()) { <a [href]="'#' + mainId()" class="cm-app-shell__skip-link" (click)="focusMain($event)">{{ skipLinkLabel() }}</a> }
    @if (sidebar(); as navigation) {
      <aside class="cm-app-shell__sidebar" [inert]="modalOpen()"><ng-container [ngTemplateOutlet]="navigation" [ngTemplateOutletContext]="controls()" /></aside>
      <div class="cm-app-shell__mobile-layer" [attr.aria-hidden]="!modalOpen()" [inert]="!modalOpen()">
        <button type="button" class="cm-app-shell__mobile-backdrop" [attr.aria-label]="mobileCloseLabel()" (click)="changeMobile(false)"></button>
        <aside #drawer [id]="drawerId" class="cm-app-shell__mobile-drawer" role="dialog" [attr.aria-modal]="modalOpen() || null" aria-label="Menu" tabindex="-1">
          <button type="button" class="cm-app-shell__mobile-close" [attr.aria-label]="mobileCloseLabel()" (click)="changeMobile(false)"><cm-icon name="x" [size]="18" /></button>
          <ng-container [ngTemplateOutlet]="navigation" [ngTemplateOutletContext]="controls()" />
        </aside>
      </div>
    }
    <div class="cm-app-shell__main" [inert]="modalOpen()">
      @if (topbar(); as header) {
        <div class="cm-app-shell__topbar"><ng-container [ngTemplateOutlet]="header" [ngTemplateOutletContext]="controls()" /></div>
      } @else if (sidebar()) {
        <div class="cm-app-shell__mobile-topbar"><ng-container [ngTemplateOutlet]="menuToggle" /></div>
      }
      <main #main class="cm-app-shell__content" [id]="mainId()" tabindex="-1"><ng-content /></main>
      @if (footer(); as bottom) { <footer class="cm-app-shell__footer"><ng-container [ngTemplateOutlet]="bottom" [ngTemplateOutletContext]="controls()" /></footer> }
    </div>
  `,
})
export class CmAppShell {
  private readonly document = inject(DOCUMENT)
  private readonly destroy = inject(DestroyRef)
  private readonly id = ++shellId
  private readonly narrow = signal(false)
  private readonly uncontrolledOpen = signal(false)
  private readonly main = viewChild<ElementRef<HTMLElement>>('main')
  private readonly drawer = viewChild<ElementRef<HTMLElement>>('drawer')
  private readonly menuToggle = viewChild<TemplateRef<unknown>>('menuToggle')
  readonly chrome = input('surface')
  readonly backdrop = input('plain')
  readonly density = input<string>()
  readonly contentId = input<string>()
  readonly contentKey = input<unknown>()
  readonly height = input<Dimension>()
  readonly sidebarWidth = input<Dimension>()
  readonly collapsedSidebarWidth = input<Dimension>()
  readonly contentPadding = input<Dimension>()
  readonly sidebar = input<TemplateRef<{ $implicit: CmAppShellControls }>>()
  readonly topbar = input<TemplateRef<{ $implicit: CmAppShellControls }>>()
  readonly footer = input<TemplateRef<{ $implicit: CmAppShellControls }>>()
  readonly defaultMobileSidebarOpen = input(false, { transform: booleanAttribute })
  readonly mobileSidebarOpen = input<boolean>()
  readonly mobileMenuLabel = input('Abrir menu')
  readonly mobileCloseLabel = input('Fechar menu')
  readonly skipLinkLabel = input<string>()
  readonly mobileSidebarOpenChange = output<boolean>()
  protected readonly drawerId = 'cm-menu-' + this.id
  protected readonly mainId = computed(() => this.contentId() ?? 'cm-main-' + this.id)
  protected readonly mobileOpen = computed(() => this.mobileSidebarOpen() ?? this.uncontrolledOpen())
  protected readonly modalOpen = computed(() => !!this.sidebar() && this.mobileOpen() && this.narrow())
  protected readonly controls = computed(() => ({ $implicit: {
    closeMobileSidebar: () => this.changeMobile(false), openMobileSidebar: () => this.changeMobile(true),
    toggleMobileSidebar: () => this.changeMobile(!this.mobileOpen()), mobileSidebarOpen: this.mobileOpen,
    mobileMenuButton: this.sidebar() ? this.menuToggle() : undefined,
  } }))
  protected readonly rootClass = computed(() => classes('cm-app-shell', `cm-app-shell--chrome-${this.chrome()}`,
    `cm-app-shell--backdrop-${this.backdrop()}`, !this.sidebar() && 'cm-app-shell--no-sidebar',
    this.mobileOpen() && 'cm-app-shell--mobile-open', this.density() && `cm-density-${this.density()}`))
  protected readonly rootStyle = computed(() => ({
    '--cm-app-shell-sidebar-width': dimension(this.sidebarWidth()),
    '--cm-app-shell-sidebar-collapsed-width': dimension(this.collapsedSidebarWidth()),
    '--cm-app-shell-content-padding': spacing(this.contentPadding()), '--cm-app-shell-height': dimension(this.height()),
  }))

  ngOnInit() { this.uncontrolledOpen.set(this.defaultMobileSidebarOpen()) }

  constructor() {
    afterNextRender(() => {
      const media = this.document.defaultView?.matchMedia('(max-width: 860px)')
      if (!media) return
      const update = () => this.narrow.set(media.matches)
      update()
      media.addEventListener('change', update)
      this.destroy.onDestroy(() => media.removeEventListener('change', update))
    })
    effect(() => {
      const key = this.contentKey()
      const main = this.main()?.nativeElement
      if (key !== undefined && main) main.scrollTop = 0
    })
    effect(onCleanup => {
      const drawer = this.drawer()?.nativeElement
      if (!drawer || !this.modalOpen()) return
      const oldActive = this.document.activeElement as HTMLElement | null
      const previousOverflow = this.document.body.style.overflow
      this.document.body.style.overflow = 'hidden'
      drawer.focus({ preventScroll: true })
      onCleanup(() => {
        this.document.body.style.overflow = previousOverflow
        if (oldActive?.isConnected) oldActive.focus({ preventScroll: true })
      })
    })
  }

  protected changeMobile(open: boolean) {
    if (this.mobileSidebarOpen() === undefined) this.uncontrolledOpen.set(open)
    this.mobileSidebarOpenChange.emit(open)
  }

  protected focusMain(event: MouseEvent) {
    event.preventDefault()
    this.main()?.nativeElement.focus({ preventScroll: true })
  }

  protected handleKeys(event: KeyboardEvent) {
    if (!this.modalOpen()) return
    if (event.key === 'Escape') { event.preventDefault(); this.changeMobile(false); return }
    const drawer = this.drawer()?.nativeElement
    if (event.key !== 'Tab' || !drawer) return
    const focusable = [...drawer.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')]
      .filter(item => item.getClientRects().length > 0 && !item.closest('[inert], [aria-hidden="true"]'))
    const first = focusable[0] ?? drawer
    const last = focusable.at(-1) ?? drawer
    const active = this.document.activeElement
    if (!drawer.contains(active) || (event.shiftKey ? active === first || active === drawer : active === last)) {
      event.preventDefault()
      const target = event.shiftKey ? last : first
      target.focus()
    }
  }
}

@Component({
  selector: 'header[cmTopbar]', imports: [NgTemplateOutlet],
  host: { '[class]': 'rootClass()', '[style.--cm-topbar-height]': 'cssHeight()' },
  template: `
    <div [class]="section('start', startAlign())">
      @if (start(); as contents) { <ng-container [ngTemplateOutlet]="contents" /> }
      @if (title()) { <div class="cm-topbar__title">{{ title() }}</div> }
    </div>
    @if (center(); as contents) { <div [class]="section('center', centerAlign())"><ng-container [ngTemplateOutlet]="contents" /></div> }
    @if (end(); as contents) { <div [class]="section('end', endAlign())"><ng-container [ngTemplateOutlet]="contents" /></div> }
  `,
})
export class CmTopbar {
  readonly title = input<string>()
  readonly tone = input('surface')
  readonly layout = input('balanced')
  readonly mobileLayout = input('stack')
  readonly bordered = input(true, { transform: booleanAttribute })
  readonly sticky = input(false, { transform: booleanAttribute })
  readonly density = input<string>()
  readonly height = input<Dimension>()
  readonly start = input<TemplateRef<unknown>>()
  readonly center = input<TemplateRef<unknown>>()
  readonly end = input<TemplateRef<unknown>>()
  readonly startAlign = input<string>()
  readonly centerAlign = input<string>()
  readonly endAlign = input<string>()
  protected readonly rootClass = computed(() => classes('cm-topbar', `cm-topbar--tone-${this.tone()}`, `cm-topbar--layout-${this.layout()}`,
    `cm-topbar--mobile-${this.mobileLayout()}`, this.sticky() && 'cm-topbar--sticky', this.bordered() && 'cm-topbar--bordered',
    this.density() && `cm-density-${this.density()}`))
  protected readonly cssHeight = computed(() => dimension(this.height()))
  protected section(position: string, align?: string) {
    return classes('cm-topbar__section', `cm-topbar__section--${position}`, align && `cm-topbar__section--align-${align}`)
  }
}

@Directive({
  selector: 'iframe[cmFrame]', host: { class: 'cm-frame', '[class.cm-frame--framed]': 'framed()', '[style.--cm-frame-height]': 'cssHeight()' },
})
export class CmFrame {
  readonly height = input<Dimension>(320)
  readonly framed = input(true, { transform: booleanAttribute })
  protected readonly cssHeight = computed(() => dimension(this.height()))
}
