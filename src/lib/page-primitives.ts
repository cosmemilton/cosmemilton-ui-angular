import { NgTemplateOutlet } from '@angular/common';
import {
  Component, Directive, TemplateRef, booleanAttribute, computed, input, output,
} from '@angular/core';
import { CmButton } from './button';

function classes(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(' ');
}

@Directive({ selector: '[cmLink]', standalone: true, host: { '[class]': 'rootClass()' } })
export class CmLink {
  readonly active = input(false, { transform: booleanAttribute });
  readonly tone = input('default');
  readonly variant = input('default');
  protected readonly rootClass = computed(() => classes('cm-link', `cm-link--${this.variant()}`, `cm-link--tone-${this.tone()}`, this.active() && 'cm-link--active'));
}

@Directive({ selector: '[cmIconBadge]', standalone: true, host: { '[class]': 'rootClass()' } })
export class CmIconBadge {
  readonly size = input('sm');
  readonly tone = input('default');
  protected readonly rootClass = computed(() => `cm-icon-badge cm-icon-badge--${this.size()} cm-icon-badge--tone-${this.tone()}`);
}

@Directive({
  selector: '[cmAspectRatio]', standalone: true,
  host: { '[class]': 'rootClass()', '[style.--cm-aspect-ratio]': 'ratio()' },
})
export class CmAspectRatio {
  readonly ratio = input(16 / 9);
  readonly center = input(false, { transform: booleanAttribute });
  readonly radius = input('lg');
  readonly surface = input('none');
  protected readonly rootClass = computed(() => classes(
    'cm-aspect-ratio', this.center() && 'cm-aspect-ratio--center',
    this.radius() !== 'lg' && `cm-aspect-ratio--radius-${this.radius()}`,
    this.surface() !== 'none' && `cm-aspect-ratio--surface-${this.surface()}`,
  ));
}

@Component({
  selector: 'cm-skeleton, div[cmSkeleton]', standalone: true,
  host: { '[class]': 'rootClass()', 'aria-hidden': 'true', '[style.--cm-skeleton-width]': 'cssWidth()', '[style.--cm-skeleton-height]': 'cssHeight()' },
  template: '@for (line of lineCount(); track $index) { <span></span> }',
})
export class CmSkeleton {
  readonly width = input<number | string>('100%');
  readonly height = input<number | string>(12);
  readonly lines = input(1);
  readonly animated = input(true, { transform: booleanAttribute });
  protected readonly rootClass = computed(() => classes('cm-skeleton', this.animated() && 'cm-skeleton--animated'));
  protected readonly cssWidth = computed(() => typeof this.width() === 'number' ? `${this.width()}px` : this.width());
  protected readonly cssHeight = computed(() => typeof this.height() === 'number' ? `${this.height()}px` : this.height());
  protected readonly lineCount = computed(() => Array.from({ length: Math.min(20, Math.max(1, Math.floor(this.lines()))) }));
}

@Component({
  selector: 'cm-status-dot, span[cmStatusDot]', standalone: true,
  host: { '[class]': 'rootClass()' },
  template: '@if (label()) { <span class="cm-sr-only">{{ label() }}</span> }',
})
export class CmStatusDot {
  readonly label = input<string>();
  readonly pulse = input(false, { transform: booleanAttribute });
  readonly size = input('md');
  readonly tone = input('default');
  protected readonly rootClass = computed(() => classes(
    'cm-status-dot', `cm-status-dot--tone-${this.tone()}`, `cm-status-dot--${this.size()}`, this.pulse() && 'cm-status-dot--pulse',
  ));
}

@Component({
  selector: 'cm-empty, div[cmEmpty]', standalone: true, imports: [CmButton, NgTemplateOutlet],
  host: { class: 'cm-empty' },
  template: `
    @if (icon(); as artwork) { <div class="cm-empty__icon"><ng-container [ngTemplateOutlet]="artwork" /></div> }
    <h3 class="cm-empty__title">{{ title() }}</h3>
    @if (description()) { <p class="cm-empty__description">{{ description() }}</p> }
    @if (actionLabel()) { <button cmButton type="button" tone="primary" (click)="action.emit()">{{ actionLabel() }}</button> }
  `,
})
export class CmEmpty {
  readonly title = input.required<string>();
  readonly description = input<string>();
  readonly icon = input<TemplateRef<unknown>>();
  readonly actionLabel = input<string>();
  readonly action = output<void>();
}

@Component({
  selector: 'header[cmPageHeader]', standalone: true, imports: [NgTemplateOutlet],
  host: { '[class]': 'rootClass()' },
  template: `
    @if (icon(); as artwork) { <div class="cm-page-header__icon"><ng-container [ngTemplateOutlet]="artwork" /></div> }
    <div class="cm-page-header__content">
      @if (eyebrow() || meta()) {
        <div class="cm-page-header__overline">
          @if (eyebrow()) { <span class="cm-page-header__eyebrow">{{ eyebrow() }}</span> }
          @if (meta(); as information) { <div class="cm-page-header__meta"><ng-container [ngTemplateOutlet]="information" /></div> }
        </div>
      }
      <h1 class="cm-page-header__title">{{ title() }}</h1>
      @if (description()) { <p class="cm-page-header__description">{{ description() }}</p> }
    </div>
    @if (actions(); as controls) { <div class="cm-page-header__actions"><ng-container [ngTemplateOutlet]="controls" /></div> }
  `,
})
export class CmPageHeader {
  readonly title = input.required<string>();
  readonly description = input<string>();
  readonly eyebrow = input<string>();
  readonly align = input('start');
  readonly density = input<string>();
  readonly layout = input('default');
  readonly icon = input<TemplateRef<unknown>>();
  readonly meta = input<TemplateRef<unknown>>();
  readonly actions = input<TemplateRef<unknown>>();
  protected readonly rootClass = computed(() => classes(
    'cm-page-header', `cm-page-header--align-${this.align()}`, this.layout() === 'wrap' && 'cm-page-header--wrap',
    this.density() && `cm-density-${this.density()}`,
  ));
}

@Component({
  selector: 'header[cmSectionHeader]', standalone: true, imports: [CmIconBadge, NgTemplateOutlet],
  host: { '[class]': 'rootClass()' },
  template: `
    @if (icon(); as artwork) {
      <div class="cm-row" data-align="center" style="--cm-layout-gap:var(--space-sm);min-width:0">
        <span cmIconBadge tone="primary" aria-hidden="true"><ng-container [ngTemplateOutlet]="artwork" /></span>
        <ng-container [ngTemplateOutlet]="heading" />
      </div>
    } @else { <ng-container [ngTemplateOutlet]="heading" /> }
    @if (actions(); as controls) { <div class="cm-section-header__actions"><ng-container [ngTemplateOutlet]="controls" /></div> }
    <ng-template #heading>
      <div class="cm-section-header__content">
        @switch (headingLevel()) {
          @case (1) { <h1 class="cm-section-header__title">{{ title() }}</h1> }
          @case (3) { <h3 class="cm-section-header__title">{{ title() }}</h3> }
          @case (4) { <h4 class="cm-section-header__title">{{ title() }}</h4> }
          @case (5) { <h5 class="cm-section-header__title">{{ title() }}</h5> }
          @case (6) { <h6 class="cm-section-header__title">{{ title() }}</h6> }
          @default { <h2 class="cm-section-header__title">{{ title() }}</h2> }
        }
        @if (description()) { <p class="cm-section-header__description">{{ description() }}</p> }
      </div>
    </ng-template>
  `,
})
export class CmSectionHeader {
  readonly title = input.required<string>();
  readonly description = input<string>();
  readonly headingLevel = input(2);
  readonly bordered = input(false, { transform: booleanAttribute });
  readonly padded = input(false, { transform: booleanAttribute });
  readonly density = input<string>();
  readonly icon = input<TemplateRef<unknown>>();
  readonly actions = input<TemplateRef<unknown>>();
  protected readonly rootClass = computed(() => classes(
    'cm-section-header', this.bordered() && 'cm-section-header--bordered', this.padded() && 'cm-section-header--padded',
    this.density() && `cm-density-${this.density()}`,
  ));
}

@Component({
  selector: 'label[cmLabel]', standalone: true, host: { class: 'cm-label' },
  template: '<span class="cm-label__text"><ng-content /></span>@if (optional()) { <span class="cm-label__optional">(opcional)</span> }',
})
export class CmLabel {
  readonly optional = input(false, { transform: booleanAttribute });
}

@Component({
  selector: 'cm-field, div[cmField]', standalone: true,
  host: { '[class]': 'rootClass()' },
  template: `
    @if (label() || labelHint()) {
      <div class="cm-field__header"><div class="cm-field__label-row">
        @if (label()) {
          @if (htmlFor()) { <label class="cm-field__label" [attr.for]="htmlFor()"><ng-container [ngTemplateOutlet]="labelText" /></label> }
          @else { <div class="cm-field__label"><ng-container [ngTemplateOutlet]="labelText" /></div> }
        }
        @if (labelHint()) { <div class="cm-field__label-hint">{{ labelHint() }}</div> }
      </div></div>
    }
    <div class="cm-field__body"><ng-content /></div>
    @if (description()) { <p class="cm-field__description" [attr.id]="descriptionId()">{{ description() }}</p> }
    @if (error()) { <p class="cm-field__error" aria-live="polite" [attr.id]="errorId()">{{ error() }}</p> }
    <ng-template #labelText>{{ label() }}@if (required()) { <span class="cm-field__required" aria-hidden="true">*</span> }</ng-template>
  `,
  imports: [NgTemplateOutlet],
})
export class CmField {
  readonly label = input<string>();
  readonly labelHint = input<string>();
  readonly description = input<string>();
  readonly descriptionId = input<string>();
  readonly error = input<string>();
  readonly errorId = input<string>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly htmlFor = input<string>();
  readonly layout = input('vertical');
  readonly control = input('custom');
  readonly density = input<string>();
  protected readonly rootClass = computed(() => classes(
    'cm-field', `cm-field--${this.layout()}`, this.control() === 'native' && 'cm-field--native',
    this.density() && `cm-density-${this.density()}`,
  ));
}
