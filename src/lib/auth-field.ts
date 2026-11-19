import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core'
import { CmButton } from './button'
import { CmIcon } from './icon'

let fieldNumber = 0

@Component({
  selector: 'cm-auth-field',
  imports: [CmButton, CmIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'cm-stack', style: '--cm-layout-gap:var(--space-xs)' },
  template: `
    @if (externalLabel()) {
      <label class="cm-text cm-text--sm cm-text--semibold cm-auth__field-label" [attr.for]="controlId">{{ label() }}</label>
    }
    <div class="cm-input cm-floating-field cm-density-comfortable" [class.cm-floating-field--unlabeled]="externalLabel()">
      <div class="cm-floating-field__control" [class.cm-floating-field--focused]="focused()">
        @if (!externalLabel()) {
          <label class="cm-floating-field__label" [class.cm-floating-field__label--floating]="floats()"
            [class.cm-floating-field__label--resting]="!floats()" [attr.for]="controlId">{{ label() }}</label>
        }
        @if (icon()) { <span class="cm-floating-field__adornment"><cm-icon [name]="icon()" [size]="17" /></span> }
        <div class="cm-floating-field__input-wrap">
          <input #field [id]="controlId" class="cm-input__control"
            [name]="name()" [type]="actualType()" [attr.autocomplete]="autocomplete() || null"
            [attr.aria-invalid]="invalid() || null" [attr.aria-describedby]="hint() ? controlId + '-hint' : null"
            [required]="required()" [value]="value()" [attr.placeholder]="placeholder() || null"
            autocapitalize="none" [spellcheck]="false"
            (focus)="focused.set(true)" (blur)="focused.set(false)" (input)="hasValue.set(!!field.value)" />
        </div>
        @if (type() === 'password') {
          <span class="cm-floating-field__adornment cm-floating-field__adornment--flush">
            <button cmButton type="button" variant="ghost" size="sm" class="cm-auth__password-toggle"
              [attr.aria-label]="(visible() ? 'Ocultar ' : 'Mostrar ') + label().toLowerCase()"
              (click)="visible.set(!visible())">
              {{ visible() ? 'Ocultar' : 'Mostrar' }}
            </button>
          </span>
        }
      </div>
    </div>
    @if (hint()) {
      <span [id]="controlId + '-hint'" class="cm-text cm-text--sm cm-text--muted">{{ hint() }}</span>
    }
  `,
})
export class CmAuthField {
  readonly label = input.required<string>()
  readonly name = input.required<string>()
  readonly value = input('')
  readonly type = input('text')
  readonly autocomplete = input('')
  readonly icon = input('')
  readonly hint = input('')
  readonly placeholder = input('')
  readonly externalLabel = input(false, { transform: booleanAttribute })
  readonly required = input(false, { transform: booleanAttribute })
  readonly invalid = input(false, { transform: booleanAttribute })
  protected readonly controlId = 'cm-auth-field-' + (++fieldNumber)
  protected readonly focused = signal(false)
  protected readonly hasValue = signal<boolean | null>(null)
  protected readonly visible = signal(false)
  protected readonly actualType = computed(() => this.type() === 'password' && this.visible() ? 'text' : this.type())
  protected readonly floats = computed(() => this.focused() || this.hasValue() || !!this.value() || !!this.placeholder())
}
