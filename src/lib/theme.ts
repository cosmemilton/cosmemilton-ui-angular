import { DOCUMENT } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, Injectable, InjectionToken, input, signal, viewChild } from '@angular/core'
import { CmButton } from './button'
import { CmIcon } from './icon'
import type { CmThemeDensity } from './theme-scope'

export const cmThemes = [
  { id: 'cm-v4-aurora', label: 'Aurora', icon: 'sparkles' },
  { id: 'cm-v4-light', label: 'Claro', icon: 'sun' },
  { id: 'cm-v4-dark', label: 'Escuro', icon: 'moon' },
] as const
export type CmThemeName = (typeof cmThemes)[number]['id']
export const CM_THEME_STORAGE = new InjectionToken<string>('cm theme storage', { factory: () => 'cm-ui-theme' })
export const CM_THEME_SKIN = new InjectionToken<string>('cm theme skin', { factory: () => 'classic' })
const CM_THEME_LOCAL = new InjectionToken<boolean>('apply theme locally', { factory: () => false })
const densities: CmThemeDensity[] = ['default', 'compact', 'comfortable']

@Injectable({ providedIn: 'root' })
export class CmThemeService {
  private readonly document = inject(DOCUMENT)
  private key: string | false = inject(CM_THEME_STORAGE)
  private readonly skin = inject(CM_THEME_SKIN)
  private readonly local = inject(CM_THEME_LOCAL)
  private readonly active = signal<CmThemeName>(cmThemes[0].id)
  private readonly activeDensity = signal<CmThemeDensity>('default')
  readonly name = this.active.asReadonly()
  readonly density = this.activeDensity.asReadonly()

  constructor() {
    if (this.local) return
    this.document.documentElement.dataset['cmSkin'] = this.skin
    this.configure(cmThemes[0].id, 'default', this.key)
  }

  set(name: CmThemeName) {
    this.active.set(name)
    this.apply()
    if (this.key !== false) this.write(this.key, name)
  }

  setDensity(density: CmThemeDensity) {
    this.activeDensity.set(density)
    this.apply()
    if (this.key !== false) this.write(this.key + '-density', density)
  }

  configure(defaultTheme: CmThemeName, defaultDensity: CmThemeDensity, storageKey: string | false) {
    this.key = storageKey
    const storedTheme = storageKey === false ? null : this.read(storageKey)
    const storedDensity = storageKey === false ? null : this.read(storageKey + '-density')
    this.active.set(cmThemes.find(item => item.id === storedTheme)?.id ?? defaultTheme)
    this.activeDensity.set(densities.find(item => item === storedDensity) ?? defaultDensity)
    this.apply()
  }

  private read(key: string) {
    try { return this.document.defaultView?.localStorage.getItem(key) ?? null } catch { return null }
  }

  private write(key: string, value: string) {
    try { this.document.defaultView?.localStorage.setItem(key, value) } catch { /* Storage may be disabled. */ }
  }

  private apply() {
    if (this.local) return
    const name = this.active()
    this.document.documentElement.dataset['theme'] = name
    this.document.documentElement.dataset['density'] = this.density()
    this.document.documentElement.style.colorScheme = name === 'cm-v4-dark' ? 'dark' : 'light'
  }
}

@Component({
  selector: 'cm-theme-provider, div[cmThemeProvider]',
  providers: [CmThemeService, { provide: CM_THEME_LOCAL, useValue: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'cm-theme-scope', '[attr.data-theme]': 'theme.name()', '[attr.data-density]': 'theme.density()', '[attr.data-cm-skin]': 'skin()' },
  template: '<ng-content />',
})
export class CmThemeProvider {
  protected readonly theme = inject(CmThemeService)
  readonly defaultThemeName = input<CmThemeName>('cm-v4-aurora')
  readonly defaultDensity = input<CmThemeDensity>('default')
  readonly storageKey = input<string | false>(false)
  readonly skin = input<string>()

  ngOnInit() { this.theme.configure(this.defaultThemeName(), this.defaultDensity(), this.storageKey()) }
}

@Component({
  selector: 'cm-theme-menu',
  imports: [CmButton, CmIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'cm-dropdown-menu', '(keydown)': 'handleKey($event)' },
  template: `
    @if (presentation() === 'compact') {
      <button #trigger cmButton type="button" variant="surface" tone="primary" size="sm" shape="pill"
        [class]="'cm-theme-toggle-compact cm-theme-toggle-compact--label-' + labelVisibility() + ' ' + buttonClass()"
        [attr.aria-label]="'Selecionar tema: ' + current()" aria-haspopup="menu" [attr.aria-expanded]="open()" (click)="open.set(!open())">
        <cm-icon [name]="currentIcon()" [size]="16" />
        <span class="cm-theme-toggle-compact__label">{{ current() }}</span>
        <cm-icon name="chevron-down" [size]="16" />
      </button>
    } @else {
      <button #trigger cmButton iconOnly variant="ghost" type="button" [class]="buttonClass()"
        [attr.aria-label]="'Tema atual: ' + current()" aria-haspopup="menu" [attr.aria-expanded]="open()" (click)="open.set(!open())">
        <cm-icon name="palette" [size]="18" />
        <span class="cm-sr-only">Tema atual: {{ current() }}</span>
      </button>
    }
    @if (open()) {
      <div #menu [class]="'cm-dropdown-menu__menu cm-dropdown-menu__menu--' + align()" role="menu" aria-label="Temas">
        @for (item of themes; track item.id) {
          <button type="button" class="cm-dropdown-menu__item" role="menuitem" (click)="select(item.id)">
            <span class="cm-dropdown-menu__label"><cm-icon [name]="item.icon" [size]="16" /> {{ item.label }}</span>
            @if (item.id === theme.name()) { <span class="cm-dropdown-menu__shortcut">Atual</span> }
          </button>
        }
      </div>
    }
  `,
})
export class CmThemeMenu {
  readonly theme = inject(CmThemeService)
  readonly themes = cmThemes
  readonly open = signal(false)
  readonly buttonClass = input('')
  readonly align = input<'start' | 'end'>('end')
  readonly presentation = input<'icon' | 'compact'>('icon')
  readonly labelVisibility = input('always')
  readonly current = computed(() => cmThemes.find(item => item.id === this.theme.name())?.label ?? this.theme.name())
  readonly currentIcon = computed(() => cmThemes.find(item => item.id === this.theme.name())?.icon ?? 'palette')
  readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger')
  readonly menu = viewChild<ElementRef<HTMLElement>>('menu')

  select(name: CmThemeName) {
    this.theme.set(name)
    this.open.set(false)
    this.trigger()?.nativeElement.focus()
  }

  handleKey(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.open()) {
      event.preventDefault()
      this.open.set(false)
      this.trigger()?.nativeElement.focus()
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    if (!this.open()) this.open.set(true)
    requestAnimationFrame(() => {
      const items = Array.from(this.menu()?.nativeElement.querySelectorAll<HTMLButtonElement>('[role=menuitem]') ?? [])
      if (!items.length) return
      const current = items.findIndex(item => item === item.ownerDocument.activeElement)
      const last = items.length - 1
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? last : event.key === 'ArrowDown'
        ? (current + 1) % items.length : current <= 0 ? last : current - 1
      items[index].focus()
    })
  }
}

@Component({
  selector: 'cm-theme-toggle, div[cmThemeToggle]', imports: [CmThemeMenu, CmButton, CmIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (presentation() === 'compact') {
      <cm-theme-menu presentation="compact" [align]="align()" [labelVisibility]="labelVisibility()" />
    } @else {
      <div class="cm-theme-toggle">
        <span class="cm-theme-toggle-label">Tema atual: {{ current() }}</span>
        <div class="cm-theme-toggle-options">
          @for (item of themes; track item.id) {
            <button cmButton type="button" variant="ghost" tone="primary" size="sm" shape="pill" class="cm-theme-toggle-option"
              [class.cm-theme-toggle-option-active]="item.id === theme.name()" [attr.aria-current]="item.id === theme.name() ? 'true' : null"
              (click)="theme.set(item.id)"><cm-icon [name]="item.icon" [size]="16" />{{ item.label }}</button>
          }
        </div>
      </div>
    }
  `,
})
export class CmThemeToggle {
  protected readonly theme = inject(CmThemeService)
  protected readonly themes = cmThemes
  protected readonly current = computed(() => cmThemes.find(item => item.id === this.theme.name())?.label ?? this.theme.name())
  readonly presentation = input<'default' | 'compact'>('default')
  readonly align = input<'start' | 'end'>('end')
  readonly labelVisibility = input('always')
}
