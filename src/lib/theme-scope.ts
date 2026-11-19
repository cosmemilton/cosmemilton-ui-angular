import { Directive, input } from '@angular/core'
import { cmThemes, type CmThemeName } from './theme'

export type CmThemeDensity = 'default' | 'compact' | 'comfortable'
export type CmThemeScriptOptions = {
  defaultThemeName?: CmThemeName
  defaultDensity?: CmThemeDensity
  storageKey?: string | false
  skin?: string
}

@Directive({
  selector: '[cmThemeScope]',
  host: { class: 'cm-theme-scope', '[attr.data-theme]': 'themeName()', '[attr.data-density]': 'density()' },
})
export class CmThemeScope {
  readonly themeName = input<CmThemeName>()
  readonly density = input<CmThemeDensity>()
}

function serializeInline(value: unknown) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, character => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`)
}

export function CmThemeScript({
  defaultThemeName = 'cm-v4-aurora', defaultDensity = 'default', storageKey = 'cm-ui-theme', skin = 'classic',
}: CmThemeScriptOptions = {}) {
  const names = cmThemes.map(theme => theme.id)
  const densities = ['default', 'compact', 'comfortable'] as const
  const theme = names.includes(defaultThemeName) ? defaultThemeName : 'cm-v4-aurora'
  const density = densities.includes(defaultDensity) ? defaultDensity : 'default'
  return `(() => {
    const root = document.documentElement;
    const key = ${serializeInline(storageKey)};
    let theme = ${serializeInline(theme)};
    let density = ${serializeInline(density)};
    if (key !== false) {
      try {
        const storedTheme = localStorage.getItem(key);
        const storedDensity = localStorage.getItem(key + '-density');
        if (${serializeInline(names)}.includes(storedTheme)) theme = storedTheme;
        if (${serializeInline(densities)}.includes(storedDensity)) density = storedDensity;
      } catch {}
    }
    root.dataset.theme = theme;
    root.dataset.density = density;
    root.dataset.cmSkin = ${serializeInline(skin)};
    root.style.colorScheme = theme === 'cm-v4-dark' ? 'dark' : 'light';
  })();`
}
