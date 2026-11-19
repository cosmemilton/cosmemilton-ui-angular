import { booleanAttribute, computed, Directive, input } from '@angular/core'

export type CmTone = 'default' | 'primary' | 'secondary' | 'accent' | 'danger' | 'warning' | 'success' | 'info'
export type CmButtonVariant = 'solid' | 'outline' | 'ghost' | 'soft' | 'surface' | 'link' | 'plain'

@Directive({
  selector: 'button[cmButton], a[cmButton]',
  host: { '[class]': 'classes()' },
})
export class CmButton {
  readonly variant = input<CmButtonVariant>('solid')
  readonly tone = input<CmTone>('default')
  readonly size = input<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md')
  readonly shape = input<'default' | 'pill' | 'square'>('default')
  readonly iconOnly = input(false, { transform: booleanAttribute })
  readonly fullWidth = input(false, { transform: booleanAttribute })
  readonly classes = computed(() => [
    'cm-button', 'cm-button--' + this.variant(), 'cm-button--tone-' + this.tone(),
    'cm-button--shape-' + this.shape(), 'cm-button--' + (this.iconOnly() ? 'icon-' : '') + this.size(),
    this.fullWidth() ? 'cm-button--full-width' : '',
  ].join(' '))
}
