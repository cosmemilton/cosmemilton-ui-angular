import { Component, Directive, computed, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { CmIcon } from './icon';
import { CmGridContainer, CmText } from './layout-primitives';

export interface CmSummaryItem {
  id?: string | number;
  label: string;
  value: string | number;
  tone?: string;
  emphasis?: boolean;
}

@Component({
  selector: 'cm-summary-list',
  standalone: true,
  host: { style: 'display: contents' },
  template: `
    <dl [class]="rootClass()" [style.--cm-summary-list-columns]="columns() > 1 ? columns() : null">
      @for (item of items(); track item.id ?? $index) {
        <div class="cm-summary-list__item">
          <dt class="cm-summary-list__label">{{ item.label }}</dt>
          <dd [class]="valueClass(item)">{{ item.value }}</dd>
        </div>
      }
    </dl>
  `,
})
export class CmSummaryList {
  readonly items = input.required<readonly CmSummaryItem[]>();
  readonly columns = input(1);
  readonly divided = input(true);
  readonly layout = input<'rows' | 'stacked'>('rows');
  readonly rootClass = computed(() => `cm-summary-list cm-summary-list--${this.layout()}${this.divided() ? ' cm-summary-list--divided' : ''}`);

  protected valueClass(item: CmSummaryItem) {
    const tone = item.tone ? ` cm-summary-list__value--tone-${item.tone}` : '';
    return `cm-summary-list__value${tone}${item.emphasis ? ' cm-summary-list__value--emphasis' : ''}`;
  }
}

export interface CmTimelineItem {
  id?: string | number;
  label?: string;
  title?: string;
  description?: string;
  tone?: string;
  href?: string;
  trailing?: string;
  icon?: string;
  iconSize?: number;
  dateTime?: string;
}

@Component({
  selector: 'cm-timeline',
  imports: [CmIcon, CmText],
  standalone: true,
  host: { style: 'display: contents' },
  template: `
    <ol [class]="'cm-timeline cm-timeline--variant-' + variant()" [style.--cm-timeline-label-width]="width()">
      @for (item of items(); track item.id ?? $index) {
        <li class="cm-timeline__item">
          @if (hasLabels()) {
            <div class="cm-timeline__label">
              @if (item.dateTime) { <time cmText size="xs" [attr.datetime]="item.dateTime">{{ item.label }}</time> }
              @else { {{ item.label }} }
            </div>
          }
          <div class="cm-timeline__rail" aria-hidden="true">
            @if (items().length > 1) {
              <span class="cm-timeline__connector" [class.cm-timeline__connector--first]="$first"
                [class.cm-timeline__connector--last]="$last"></span>
            }
            <span [class]="'cm-timeline__marker cm-timeline__marker--tone-' + (item.tone ?? tone())" [class.cm-timeline__marker--icon]="!!item.icon">
              @if (item.icon) { <cm-icon [name]="item.icon" [size]="item.iconSize ?? 14" /> }
            </span>
          </div>
          <div class="cm-timeline__content">
            <div class="cm-timeline__main">
              @if (item.title) {
                <div class="cm-timeline__title">
                  @if (item.href) { <a [href]="item.href">{{ item.title }}</a> }
                  @else { {{ item.title }} }
                </div>
              }
              @if (item.description) { <div class="cm-timeline__description">{{ item.description }}</div> }
            </div>
            @if (item.trailing) { <div class="cm-timeline__trailing">{{ item.trailing }}</div> }
          </div>
        </li>
      }
    </ol>
  `,
})
export class CmTimeline {
  readonly items = input.required<readonly CmTimelineItem[]>();
  readonly labelWidth = input<string | number>();
  readonly tone = input('primary');
  readonly variant = input<'default' | 'connected'>('default');
  readonly hasLabels = computed(() => this.items().some(item => item.label != null));
  readonly width = computed(() => {
    const width = this.labelWidth();
    return typeof width === 'number' ? `${width}px` : width;
  });
}

@Component({
  selector: 'cm-avatar',
  standalone: true,
  host: { '[class]': "'cm-avatar cm-avatar--' + size()" },
  template: `
    @if (src() && failedSource() !== src()) {
      <img class="cm-avatar__image" [src]="src()" [alt]="alt()" loading="lazy" decoding="async" (error)="failedSource.set(src())" />
    } @else {
      {{ fallback() || alt().charAt(0) || '?' }}
    }
  `,
})
export class CmAvatar {
  readonly src = input('');
  readonly alt = input('');
  readonly fallback = input('');
  readonly size = input<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly failedSource = signal('');
}

@Directive({ selector: 'kbd[cmKbd]', standalone: true, host: { class: 'cm-kbd' } })
export class CmKbd {}

@Component({
  selector: 'cm-item',
  standalone: true,
  host: { style: 'display: contents' },
  template: `
    <ng-template #content>
      <div class="cm-item__body">
        <span class="cm-item__title">{{ title() }}</span>
        @if (description()) { <span class="cm-item__description">{{ description() }}</span> }
      </div>
      @if (meta()) { <span class="cm-item__meta">{{ meta() }}</span> }
    </ng-template>
    @if (interactive()) {
      <button class="cm-item cm-item--interactive" type="button" (click)="selected.emit()">
        <ng-container [ngTemplateOutlet]="content" />
      </button>
    } @else {
      <div class="cm-item"><ng-container [ngTemplateOutlet]="content" /></div>
    }
  `,
  imports: [NgTemplateOutlet],
})
export class CmItem {
  readonly title = input.required<string>();
  readonly description = input('');
  readonly meta = input('');
  readonly interactive = input(false);
  readonly selected = output<void>();
}

export interface CmBreadcrumbItem { label: string; href?: string }

@Component({
  selector: 'cm-breadcrumb',
  standalone: true,
  host: { style: 'display: contents' },
  template: `
    <nav class="cm-breadcrumb" [attr.aria-label]="label()">
      @for (item of items(); track $index) {
        <span class="cm-breadcrumb__item">
          @if (item.href && !$last) {
            <a class="cm-breadcrumb__link" [href]="item.href">{{ item.label }}</a>
          } @else {
            <span [attr.aria-current]="$last ? 'page' : null" [class.cm-breadcrumb__current]="$last">{{ item.label }}</span>
          }
          @if (!$last) { <span class="cm-breadcrumb__separator" aria-hidden="true">/</span> }
        </span>
      }
    </nav>
  `,
})
export class CmBreadcrumb {
  readonly items = input.required<readonly CmBreadcrumbItem[]>();
  readonly label = input('breadcrumb');
}

@Directive({
  selector: '[cmButtonGroup]',
  standalone: true,
  host: {
    role: 'group',
    '[class]': 'rootClass()',
    '[style.--cm-button-group-gap]': 'resolvedGap()',
  },
})
export class CmButtonGroup {
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
  readonly fullWidth = input(false);
  readonly gap = input<string | number>('none');
  readonly resolvedGap = computed(() => {
    const gap = this.gap();
    if (!gap || gap === 'none') return '0';
    if (typeof gap === 'number') return `${gap}px`;
    return /^(xs|sm|md|lg|xl|2xl|3xl)$/.test(gap) ? `var(--space-${gap})` : gap;
  });
  readonly rootClass = computed(() => [
    'cm-button-group', `cm-button-group--${this.orientation()}`,
    /^0(?:px|rem)?$/.test(this.resolvedGap()) ? 'cm-button-group--joined' : 'cm-button-group--spaced',
    this.fullWidth() ? 'cm-button-group--full-width' : '',
  ].filter(Boolean).join(' '));
}

@Component({
  selector: 'cm-list-panel',
  standalone: true,
  imports: [CmGridContainer],
  host: { style: 'display: contents' },
  template: `
    <div class="cm-card cm-card--surface cm-card--tone-default cm-card--flat">
      <div class="cm-card__header">
        <div class="cm-section-header">
          <div class="cm-section-header__content">
            <h2 class="cm-section-header__title">{{ title() }}</h2>
            @if (description()) { <p class="cm-section-header__description" [attr.aria-live]="descriptionLive()">{{ description() }}</p> }
          </div>
          @if (showActions()) {
            <div class="cm-section-header__actions"><ng-content select="[cmListActions]" /></div>
          }
        </div>
      </div>
      <div class="cm-card__body cm-card--padding-md">
        <div class="cm-stack" style="--cm-layout-gap:var(--space-md)">
          @if (showFilters()) {
            <div cmGridContainer preset="filters" role="group" [attr.aria-label]="filterLabel() || title()">
              <ng-content select="[cmListFilters]" />
            </div>
          }
          <ng-content />
        </div>
      </div>
    </div>
  `,
})
export class CmListPanel {
  readonly title = input.required<string>();
  readonly description = input('');
  readonly descriptionLive = input<'polite' | 'assertive'>();
  readonly filterLabel = input('');
  readonly showActions = input(false);
  readonly showFilters = input(false);
}
