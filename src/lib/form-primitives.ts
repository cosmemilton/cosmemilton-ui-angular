import {
  booleanAttribute, ChangeDetectionStrategy, Component, computed, Directive, forwardRef,
  input, ModelSignal, model, signal,
} from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import { CmField } from './page-primitives'

let sequence = 0

@Directive()
abstract class ValueField<T> implements ControlValueAccessor {
  readonly label = input.required<string>()
  readonly name = input('')
  readonly inputId = input('')
  readonly hint = input('')
  readonly disabled = input(false, { transform: booleanAttribute })
  readonly required = input(false, { transform: booleanAttribute })
  readonly invalid = input(false, { transform: booleanAttribute })

  private readonly generatedId = 'cm-field-' + (++sequence)
  private readonly formValue = signal<T | undefined>(undefined)
  private readonly formOwnsValue = signal(false)
  private readonly formDisabled = signal(false)
  private onChange: (value: T) => void = () => {}
  private onTouched: () => void = () => {}
  protected abstract readonly modelValue: ModelSignal<T>
  protected abstract normalize(value: unknown): T

  readonly controlId = computed(() => this.inputId() || this.generatedId)
  readonly describedBy = computed(() => this.hint() ? this.controlId() + '-hint' : null)
  readonly disabledState = computed(() => this.disabled() || this.formDisabled())
  readonly current = computed(() => this.formOwnsValue() ? this.formValue() ?? this.normalize(null) : this.modelValue())

  writeValue(value: unknown) {
    this.formValue.set(this.normalize(value))
    this.formOwnsValue.set(true)
  }

  registerOnChange(handler: (value: T) => void) { this.onChange = handler }
  registerOnTouched(handler: () => void) { this.onTouched = handler }
  setDisabledState(disabled: boolean) { this.formDisabled.set(disabled) }
  touched() { this.onTouched() }

  publish(value: T) {
    if (this.formOwnsValue()) {
      this.formValue.set(value)
      this.onChange(value)
    } else {
      this.modelValue.set(value)
    }
  }
}

@Directive()
abstract class StringField extends ValueField<string> {
  readonly value = model('')
  protected readonly modelValue = this.value

  protected normalize(value: unknown) { return value == null ? '' : String(value) }
}

@Directive()
abstract class BooleanField extends ValueField<boolean> {
  readonly checked = model(false)
  protected readonly modelValue = this.checked

  protected normalize(value: unknown) { return value === true }
}

@Component({
  selector: 'cm-native-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CmNativeInput), multi: true }],
  host: { style: 'display:block;min-inline-size:0' },
  template: `
    <label class="cm-angular-field" [attr.for]="controlId()">
      {{ label() }}
      <input #control [id]="controlId()" [name]="name()" [type]="type()" [value]="current()" [placeholder]="placeholder()"
        [attr.min]="min() ?? null" [attr.max]="max() ?? null" [attr.step]="step() ?? null" [attr.maxlength]="maxlength() ?? null"
        [attr.autocomplete]="autocomplete() || null" [attr.aria-describedby]="describedBy()" [attr.aria-invalid]="invalid() || null"
        [required]="required()" [disabled]="disabledState()" [readOnly]="readonly()"
        (input)="publish(control.value)" (blur)="touched()" />
      @if (hint()) { <small class="cm-text cm-text--xs cm-text--muted" [attr.id]="describedBy()">{{ hint() }}</small> }
    </label>
  `,
})
export class CmNativeInput extends StringField {
  readonly type = input('text')
  readonly placeholder = input('')
  readonly autocomplete = input('')
  readonly min = input<string | number>()
  readonly max = input<string | number>()
  readonly step = input<string | number>()
  readonly maxlength = input<number>()
  readonly readonly = input(false, { transform: booleanAttribute })
}

export type CmNativeOption = { value: string; label: string; disabled?: boolean }

@Component({
  selector: 'cm-native-select',
  imports: [CmField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CmNativeSelect), multi: true }],
  host: { style: 'display:block;min-inline-size:0' },
  template: `
    <div cmField control="native" [label]="label()" [htmlFor]="controlId()" [required]="required()"
      [description]="hint()" [descriptionId]="describedBy() ?? undefined">
      <select #control [id]="controlId()" [name]="name()" [value]="current()" [required]="required()" [disabled]="disabledState()"
        [attr.aria-invalid]="invalid() || null" [attr.aria-describedby]="describedBy()"
        (change)="publish(control.value)" (blur)="touched()">
        @if (placeholder()) { <option value="" [selected]="current() === ''">{{ placeholder() }}</option> }
        @for (option of options(); track option.value) {
          <option [value]="option.value" [disabled]="option.disabled ?? false" [selected]="current() === option.value">{{ option.label }}</option>
        }
      </select>
    </div>
  `,
})
export class CmNativeSelect extends StringField {
  readonly options = input.required<readonly CmNativeOption[]>()
  readonly placeholder = input('')
}

@Component({
  selector: 'cm-textarea',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CmTextarea), multi: true }],
  host: { style: 'display:block;min-inline-size:0' },
  template: `
    <label class="cm-angular-field" [attr.for]="controlId()">
      {{ label() }}
      <textarea #control [id]="controlId()" [name]="name()" [rows]="rows()" [value]="current()" [placeholder]="placeholder()"
        [attr.maxlength]="maxlength() ?? null" [attr.aria-describedby]="describedBy()" [attr.aria-invalid]="invalid() || null"
        [required]="required()" [disabled]="disabledState()" [readOnly]="readonly()"
        (input)="publish(control.value)" (blur)="touched()"></textarea>
      @if (hint()) { <small class="cm-text cm-text--xs cm-text--muted" [attr.id]="describedBy()">{{ hint() }}</small> }
    </label>
  `,
})
export class CmTextarea extends StringField {
  readonly placeholder = input('')
  readonly rows = input(3)
  readonly maxlength = input<number>()
  readonly readonly = input(false, { transform: booleanAttribute })
}

@Component({
  selector: 'cm-checkbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CmCheckbox), multi: true }],
  host: { style: 'display:block' },
  template: `
    <label class="cm-angular-check-field" [attr.for]="controlId()">
      <input #control [id]="controlId()" type="checkbox" [name]="name()" [checked]="current()" [indeterminate]="indeterminate()"
        [required]="required()" [disabled]="disabledState()" [attr.aria-describedby]="describedBy()" [attr.aria-invalid]="invalid() || null"
        (change)="publish(control.checked)" (blur)="touched()" />
      <span class="cm-stack" style="--cm-layout-gap:.15rem">
        {{ label() }}
        @if (hint()) { <small class="cm-text cm-text--xs cm-text--muted" [attr.id]="describedBy()">{{ hint() }}</small> }
      </span>
    </label>
  `,
})
export class CmCheckbox extends BooleanField {
  readonly indeterminate = input(false, { transform: booleanAttribute })
}

@Component({
  selector: 'cm-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CmSwitch), multi: true }],
  host: { style: 'display:block' },
  template: `
    <label class="cm-angular-check-field" [attr.for]="controlId()">
      <span class="cm-angular-switch-track">
        <input #control [id]="controlId()" role="switch" type="checkbox" [name]="name()" [checked]="current()"
          [required]="required()" [disabled]="disabledState()" [attr.aria-describedby]="describedBy()" [attr.aria-invalid]="invalid() || null"
          (change)="publish(control.checked)" (blur)="touched()" />
        <span aria-hidden="true"></span>
      </span>
      <span class="cm-stack" style="--cm-layout-gap:.15rem">
        {{ label() }}
        @if (hint()) { <small class="cm-text cm-text--xs cm-text--muted" [attr.id]="describedBy()">{{ hint() }}</small> }
      </span>
    </label>
  `,
})
export class CmSwitch extends BooleanField {}

@Directive({
  selector: 'form[cmForm]',
  host: {
    '[class]': 'className()',
    '[style.--cm-form-gap]': 'gap()',
    '[style.--cm-form-columns-base]': 'columns()',
  },
})
export class CmForm {
  readonly layout = input<'stack' | 'grid'>('stack')
  readonly surface = input<'card' | 'plain'>('plain')
  readonly gap = input('var(--space-md)')
  readonly columns = input(2)
  readonly className = computed(() => 'cm-form cm-form--layout-' + this.layout() + (this.surface() === 'plain' ? ' cm-form--plain' : ''))
}

@Directive({ selector: '[cmFormBody]', host: { class: 'cm-form__body' } })
export class CmFormBody {}
