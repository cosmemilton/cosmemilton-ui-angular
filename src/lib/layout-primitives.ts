import { NgTemplateOutlet } from '@angular/common';
import { Component, Directive, TemplateRef, booleanAttribute, computed, input, output } from '@angular/core';

type Length = number | string;
const spaceNames = /^(none|xs|sm|md|lg|xl|2xl|3xl)$/;

function length(value: Length | undefined) {
  return typeof value === 'number' ? `${value}px` : value;
}

function spacing(value: Length | undefined) {
  if (typeof value === 'string' && spaceNames.test(value)) return value === 'none' ? '0px' : `var(--space-${value})`;
  return length(value);
}

function classes(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(' ');
}

@Directive({
  host: { '[class]': 'rootClass()', '[attr.data-align]': 'align()', '[attr.data-justify]': 'justify()', '[style]': 'layoutStyles()' },
})
abstract class LayoutPrimitive {
  protected abstract readonly kind: 'row' | 'stack' | 'col' | 'box';
  readonly gap = input<Length>();
  readonly align = input<string>();
  readonly justify = input<string>();
  readonly wrap = input(false, { transform: booleanAttribute });
  readonly fullWidth = input(false, { transform: booleanAttribute });
  readonly grow = input(false, { transform: booleanAttribute });
  readonly padding = input<Length>();
  readonly paddingInline = input<Length>();
  readonly paddingBlock = input<Length>();
  readonly width = input<Length>();
  readonly minWidth = input<Length>();
  readonly maxWidth = input<Length>();
  readonly minHeight = input<Length>();
  readonly surface = input<string>();
  readonly radius = input<string>();
  readonly border = input<string>();

  protected readonly rootClass = computed(() => classes(
    `cm-${this.kind}`,
    this.wrap() && 'cm-layout-wrap', this.fullWidth() && 'cm-layout-full', this.grow() && 'cm-layout-grow',
    (this.kind === 'box' || this.padding() != null || this.paddingInline() != null || this.paddingBlock() != null) && 'cm-layout-box',
    this.surface() && `cm-layout-surface-${this.surface()}`, this.radius() && `cm-layout-radius-${this.radius()}`,
    this.border() && `cm-layout-border-${this.border()}`,
  ));
  protected readonly layoutStyles = computed(() => ({
    '--cm-layout-gap': spacing(this.gap()), '--cm-layout-padding': spacing(this.padding()),
    '--cm-layout-padding-inline': spacing(this.paddingInline()), '--cm-layout-padding-block': spacing(this.paddingBlock()),
    'width': length(this.width()), 'min-width': length(this.minWidth()), 'max-width': length(this.maxWidth()),
    'min-height': length(this.minHeight()),
  }));
}

@Directive({ selector: '[cmStack]', standalone: true })
export class CmStack extends LayoutPrimitive { protected readonly kind = 'stack' as const; }

@Directive({ selector: '[cmRow]', standalone: true })
export class CmRow extends LayoutPrimitive { protected readonly kind = 'row' as const; }

@Directive({ selector: '[cmCol]', standalone: true })
export class CmCol extends LayoutPrimitive { protected readonly kind = 'col' as const; }

@Directive({ selector: '[cmBox]', standalone: true })
export class CmBox extends LayoutPrimitive { protected readonly kind = 'box' as const; }

@Directive({
  selector: '[cmText]', standalone: true,
  host: { '[class]': 'rootClass()' },
})
export class CmText {
  readonly size = input('sm');
  readonly tone = input('default');
  readonly weight = input('normal');
  readonly family = input('sans');
  readonly tracking = input('normal');
  readonly align = input<string>();
  readonly whiteSpace = input('normal');
  readonly wrap = input('normal');
  protected readonly rootClass = computed(() => classes(
    'cm-text', `cm-text--${this.size()}`, `cm-text--${this.tone()}`,
    `cm-text--${this.weight()}`, `cm-text--family-${this.family()}`, `cm-text--tracking-${this.tracking()}`,
    this.align() && `cm-text--align-${this.align()}`, `cm-text--white-space-${this.whiteSpace()}`, `cm-text--wrap-${this.wrap()}`,
  ));
}

@Directive({ selector: '[cmContainer]', standalone: true, host: { class: 'cm-container', '[style]': 'containerStyles()' } })
export class CmContainer {
  readonly maxWidth = input<Length>();
  readonly padding = input<Length>();
  readonly paddingInline = input<Length>();
  readonly paddingBlock = input<Length>();
  readonly fluid = input(false, { transform: booleanAttribute });
  protected readonly containerStyles = computed(() => ({
    '--cm-container-max-width': this.fluid() ? '100%' : length(this.maxWidth()),
    '--cm-container-padding': spacing(this.padding()), '--cm-container-padding-inline': spacing(this.paddingInline()),
    '--cm-container-padding-block': spacing(this.paddingBlock()),
  }));
}

@Directive({
  selector: '[cmPage]', standalone: true,
  host: { class: 'cm-page', '[class.cm-page--full-width]': 'fullWidth()', '[style]': 'pageStyles()' },
})
export class CmPage {
  readonly gap = input<Length>();
  readonly padding = input<Length>();
  readonly maxWidth = input<Length>();
  readonly fullWidth = input(true, { transform: booleanAttribute });
  protected readonly pageStyles = computed(() => ({
    '--cm-page-gap': spacing(this.gap()), '--cm-page-padding': spacing(this.padding()), '--cm-page-max-width': length(this.maxWidth()),
  }));
}

type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl';
type ResponsiveNumber = number | Partial<Record<Breakpoint, number>>;
const breakpoints = ['base', 'sm', 'md', 'lg', 'xl'] as const;
const gridPresets: Record<string, string> = { filters: '12rem', metrics: '14rem', form: '16rem' };

function responsive(prefix: string, values: ResponsiveNumber) {
  let last = 1;
  return Object.fromEntries(breakpoints.map(key => {
    last = typeof values === 'number' ? values : values[key] ?? last;
    return [prefix + key, Math.max(1, Math.round(last))];
  }));
}

function gridGap(value: Length) {
  const gap = spacing(value);
  return Object.fromEntries(breakpoints.flatMap(key => {
    const suffix = key === 'base' ? '' : `-${key}`;
    return [[`--grid-row-gap${suffix}`, gap], [`--grid-column-gap${suffix}`, gap]];
  }));
}

@Directive({ selector: '[cmGridContainer]', standalone: true, host: { '[class]': 'rootClass()', '[style]': 'styles()' } })
export class CmGridContainer {
  readonly columns = input<ResponsiveNumber>({ base: 1, md: 2, xl: 4 });
  readonly spacing = input<Length>('md');
  readonly preset = input('default');
  readonly minColumnWidth = input<Length>();
  readonly autoFit = input(false, { transform: booleanAttribute });
  readonly autoFill = input(false, { transform: booleanAttribute });
  protected readonly auto = computed(() => this.autoFit() || this.autoFill() || this.minColumnWidth() != null || this.preset() in gridPresets);
  protected readonly rootClass = computed(() => classes('cm-grid-container', this.preset() !== 'default' && `cm-grid-container--preset-${this.preset()}`, this.auto() && 'cm-grid-container--auto'));
  protected readonly styles = computed(() => ({
    ...responsive('--grid-columns-', this.columns()), ...gridGap(this.spacing()),
    ...(this.auto() ? {
      '--grid-auto-mode': this.autoFill() ? 'auto-fill' : 'auto-fit',
      ...Object.fromEntries(breakpoints.map(key => [`--grid-min-column-width-${key}`, spacing(this.minColumnWidth()) ?? gridPresets[this.preset()] ?? '16rem'])),
    } : {}),
  }));
}

@Directive({ selector: '[cmGrid]', standalone: true, host: { class: 'cm-grid cm-grid--size-span-base cm-grid--size-span-sm cm-grid--size-span-md cm-grid--size-span-lg cm-grid--size-span-xl', '[style]': 'styles()' } })
export class CmGrid {
  readonly span = input<ResponsiveNumber>(1);
  protected readonly styles = computed(() => responsive('--grid-span-', this.span()));
}

@Directive({ selector: '[cmBadge]', standalone: true, host: { '[class]': 'rootClass()' } })
export class CmBadge {
  readonly tone = input('default');
  readonly size = input('md');
  readonly variant = input('soft');
  protected readonly rootClass = computed(() => `cm-badge cm-badge--${this.variant()} cm-badge--tone-${this.tone()} cm-badge--${this.size()}`);
}

@Directive({
  selector: '[cmSeparator]', standalone: true,
  host: { role: 'separator', '[attr.aria-orientation]': 'orientation()', '[class]': 'rootClass()' },
})
export class CmSeparator {
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
  protected readonly rootClass = computed(() => `cm-separator cm-separator--${this.orientation()}`);
}

@Directive({ selector: '[cmMetricGrid]', standalone: true, host: { class: 'cm-grid-container', '[attr.aria-label]': 'label()', '[style]': 'styles()' } })
export class CmMetricGrid {
  readonly label = input<string>();
  readonly columns = input<ResponsiveNumber>({ base: 1, sm: 2, xl: 4 });
  readonly spacing = input<Length>('md');
  protected readonly styles = computed(() => ({ ...responsive('--grid-columns-', this.columns()), ...gridGap(this.spacing()) }));
}

@Component({
  selector: 'cm-metric-card', standalone: true,
  host: {
    '[class]': 'rootClass()', '[attr.aria-busy]': 'loading() || null', '[attr.role]': 'interactive() ? "button" : null',
    '[attr.tabindex]': 'interactive() ? 0 : null', '(click)': 'activate($event)', '(keydown)': 'handleKey($event)',
  },
  template: `
    <div class="cm-metric-card__header">
      <span class="cm-metric-card__title">{{ title() }}</span>
      @if (showIcon()) { <span class="cm-metric-card__icon"><ng-content select="[cmMetricIcon]" /></span> }
    </div>
    <div class="cm-metric-card__body">
      <span class="cm-metric-card__value">{{ loading() ? '...' : value() }}</span>
      @if (description()) { <span class="cm-metric-card__description">{{ description() }}</span> }
    </div>
    @if (trend(); as change) {
      <div class="cm-metric-card__trend">
        <span class="cm-metric-card__trend-value" [class.cm-metric-card__trend-value--positive]="change.value > 0"
          [class.cm-metric-card__trend-value--negative]="change.value < 0">{{ trendLabel() }}</span>
        <span class="cm-metric-card__trend-label">{{ change.label }}</span>
      </div>
    }
    <ng-content />
  `,
})
export class CmMetricCard {
  readonly title = input.required<string>();
  readonly value = input.required<string | number>();
  readonly description = input<string>();
  readonly tone = input('default');
  readonly variant = input('surface');
  readonly accent = input('none');
  readonly density = input<string>();
  readonly showIcon = input(false, { transform: booleanAttribute });
  readonly interactive = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  readonly trend = input<{ value: number; formattedValue?: string; label?: string }>();
  readonly activated = output<Event>();
  protected readonly rootClass = computed(() => classes(
    'cm-metric-card', `cm-metric-card--tone-${this.tone()}`, this.variant() !== 'surface' && `cm-metric-card--${this.variant()}`,
    this.accent() !== 'none' && `cm-metric-card--accent-${this.accent()}`, this.density() && `cm-density-${this.density()}`,
    this.interactive() && 'cm-metric-card--interactive', this.loading() && 'cm-metric-card--loading',
  ));
  protected readonly trendLabel = computed(() => {
    const change = this.trend();
    if (!change) return '';
    const arrow = change.value > 0 ? '↑ ' : change.value < 0 ? '↓ ' : '';
    return arrow + (change.formattedValue ?? `${Math.abs(change.value)}%`);
  });

  protected activate(event: Event) { if (this.interactive()) this.activated.emit(event); }

  protected handleKey(event: KeyboardEvent) {
    if (!this.interactive() || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    this.activated.emit(event);
  }
}

@Component({
  selector: 'cm-card, div[cmCard], article[cmCard], section[cmCard]', imports: [NgTemplateOutlet],
  host: { '[class]': 'rootClass()', '[style.--cm-card-cover-height]': 'coverHeight()' },
  template: `
    <ng-template #contents><ng-content /></ng-template>
    @if (structured()) {
      @if (cover()) {
        <div class="cm-card__cover">
          @if (coverTemplate(); as template) { <ng-container [ngTemplateOutlet]="template" /> }
        </div>
      }
      @if (header(); as heading) { <div class="cm-card__header"><ng-container [ngTemplateOutlet]="heading" /></div> }
      <div [class]="'cm-card__body cm-card--padding-' + (bodyPadding() ?? padding())" [class.cm-card__body--with-aside]="aside()">
        @if (aside(); as sideline) {
          <div class="cm-card__main"><ng-container [ngTemplateOutlet]="contents" /></div>
          <div class="cm-card__aside"><ng-container [ngTemplateOutlet]="sideline" /></div>
        } @else { <ng-container [ngTemplateOutlet]="contents" /> }
      </div>
      @if (footer(); as closing) { <div class="cm-card__footer"><ng-container [ngTemplateOutlet]="closing" /></div> }
    } @else { <ng-container [ngTemplateOutlet]="contents" /> }
  `,
})
export class CmCard {
  readonly variant = input('surface');
  readonly tone = input('default');
  readonly padding = input('md');
  readonly bodyPadding = input<string>();
  readonly pattern = input<string>();
  readonly accent = input('none');
  readonly density = input<string>();
  readonly elevated = input(false, { transform: booleanAttribute });
  readonly interactive = input(false, { transform: booleanAttribute });
  readonly header = input<TemplateRef<unknown>>();
  readonly footer = input<TemplateRef<unknown>>();
  readonly aside = input<TemplateRef<unknown>>();
  readonly cover = input<boolean | TemplateRef<unknown>>(false);
  readonly coverHeight = input<string>();
  protected readonly coverTemplate = computed(() => typeof this.cover() === 'object' ? this.cover() as TemplateRef<unknown> : undefined);
  protected readonly structured = computed(() => !!(this.header() || this.footer() || this.aside() || this.cover()));
  protected readonly rootClass = computed(() => classes(
    'cm-card', `cm-card--${this.variant()}`, `cm-card--tone-${this.tone()}`,
    !this.structured() && `cm-card--padding-${this.padding()}`,
    this.elevated() ? 'cm-card--elevated' : 'cm-card--flat', this.aside() && 'cm-card--with-aside',
    this.pattern() && this.pattern() !== 'none' && `cm-card--patterned cm-card--pattern-${this.pattern()}`,
    this.density() && `cm-density-${this.density()}`, this.interactive() && 'cm-card--interactive',
    this.accent() !== 'none' && `cm-card--accent-${this.accent()}`,
  ));
}

@Component({
  selector: 'cm-progress', standalone: true, host: { '[class]': 'rootClass()' },
  template: `
    @if ((label() && !srOnlyLabel()) || showValue()) {
      <div class="cm-progress__header" aria-hidden="true">
        @if (label() && !srOnlyLabel()) { <span class="cm-progress__label">{{ label() }}</span> }
        @if (showValue()) { <span class="cm-progress__value">{{ valueText() ?? percent() + '%' }}</span> }
      </div>
    }
    <progress class="cm-progress__bar" [attr.aria-label]="label() || 'Progresso'" [max]="span()" [value]="nativeValue()"
      [style.height]="height()"></progress>
  `,
})
export class CmProgress {
  readonly label = input<string>();
  readonly min = input(0);
  readonly max = input(100);
  readonly value = input.required<number>();
  readonly showValue = input(false, { transform: booleanAttribute });
  readonly srOnlyLabel = input(false, { transform: booleanAttribute });
  readonly valueText = input<string>();
  readonly tone = input('primary');
  readonly barThickness = input<Length>();
  protected readonly span = computed(() => Math.max(1, this.max() - this.min()));
  protected readonly nativeValue = computed(() => Math.max(0, Math.min(this.span(), this.value() - this.min())));
  protected readonly percent = computed(() => Math.round(100 * this.nativeValue() / this.span()));
  protected readonly height = computed(() => length(this.barThickness()));
  protected readonly rootClass = computed(() => classes('cm-progress', this.tone() === 'inherit' && 'cm-progress--inherit'));
}
