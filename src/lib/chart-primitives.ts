import { NgTemplateOutlet } from '@angular/common'
import { booleanAttribute, Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core'

const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 })
const ticks = [1, 0.75, 0.5, 0.25, 0]
const chartTones = ['primary', 'info', 'success', 'warning', 'accent', 'secondary']
const thickness: Record<string, number> = { xs: 4, sm: 8, md: 12, lg: 16 }

export function cmChartColor(tone = 'primary') {
  if (tone === 'primary-soft') return 'var(--cm-chart-primary-soft)'
  return `var(--color-${tone === 'default' ? 'primary' : tone})`
}

export type CmChartLegendItem = { label: string; color?: string; tone?: string; value?: string; marker?: 'line' | 'dashed' }
export type CmChartTable = { caption?: string; headers: readonly string[]; rows: readonly (readonly string[])[] }

@Component({
  selector: 'cm-chart-frame', imports: [NgTemplateOutlet],
  host: { class: 'cm-chart-frame', '[attr.aria-busy]': 'loading() || null' },
  template: `
    <ng-template #legendTemplate>
      <ul class="cm-chart-frame__legend" [attr.data-layout]="legendLayout()" aria-label="Legenda">
        @for (item of legend(); track $index) {
          <li class="cm-chart-frame__legend-item" [style.--cm-chart-legend-color]="itemColor(item)">
            <span class="cm-chart-frame__legend-swatch" [attr.data-marker]="item.marker" aria-hidden="true"></span>
            <span class="cm-chart-frame__legend-label">{{ item.label }}</span>
            @if (item.value !== undefined) { <span class="cm-chart-frame__legend-value">{{ item.value }}</span> }
          </li>
        }
      </ul>
    </ng-template>
    @if (title() || description() || headerLegend()) {
      <div class="cm-chart-frame__header" [class.cm-chart-frame__header--with-actions]="headerLegend()">
        @if (title() || description()) {
          <div class="cm-chart-frame__heading">
            @if (title()) {
              <div class="cm-chart-frame__title"><h2 class="cm-text cm-text--md cm-text--semibold cm-text--family-heading">{{ title() }}</h2></div>
            }
            @if (description()) { <div class="cm-chart-frame__description">{{ description() }}</div> }
          </div>
        }
        @if (headerLegend()) { <ng-container [ngTemplateOutlet]="legendTemplate" /> }
      </div>
    }
    <div class="cm-chart-frame__body">
      @if (loading()) { <div class="cm-chart-frame__state" role="status">{{ loadingMessage() }}</div> }
      @else if (empty()) { <div class="cm-chart-frame__state">{{ emptyMessage() }}</div> }
      @else { <ng-content /> }
    </div>
    @if (showLegend() && legendPosition() === 'footer') { <ng-container [ngTemplateOutlet]="legendTemplate" /> }
    @if (!empty() && !loading() && showAccessibleTable()) {
      @if (table(); as data) {
        @if (data.rows.length) {
          <table class="cm-sr-only cm-chart-frame__table">
            @if (data.caption) { <caption>{{ data.caption }}</caption> }
            <thead><tr>@for (heading of data.headers; track $index) { <th scope="col">{{ heading }}</th> }</tr></thead>
            <tbody>@for (row of data.rows; track $index) { <tr>@for (value of row; track $index) { <td>{{ value }}</td> }</tr> }</tbody>
          </table>
        }
      }
    }
  `,
})
export class CmChartFrame {
  readonly title = input<string>()
  readonly description = input<string>()
  readonly legend = input<readonly CmChartLegendItem[]>([])
  readonly legendPosition = input<'header' | 'footer' | 'none'>('footer')
  readonly legendLayout = input<'inline' | 'list'>('inline')
  readonly table = input<CmChartTable>()
  readonly showAccessibleTable = input(true)
  readonly loading = input(false)
  readonly empty = input(false)
  readonly loadingMessage = input('Carregando dados...')
  readonly emptyMessage = input('Nenhum dado para exibir')
  protected readonly showLegend = computed(() => !this.loading() && !this.empty() && this.legend().length > 0)
  protected readonly headerLegend = computed(() => this.showLegend() && this.legendPosition() === 'header')
  protected itemColor(item: CmChartLegendItem) { return item.color ?? cmChartColor(item.tone) }
}

export type CmDonutSegment = { id?: string; label: string; value: number; color?: string; tone?: string }

function donutStroke(start: number, fraction: number, segmented: boolean) {
  if (!segmented) return { width: 10, cap: 'butt', offset: -start * 100, dashes: `${fraction * 100} ${(1 - fraction) * 100}` }
  const circumference = 2 * Math.PI * 42
  const length = fraction * circumference
  const width = Math.min(10, length * 0.65)
  const trim = (width + Math.min(3, length * 0.25)) / circumference * 100
  const dash = fraction * 100 - trim
  return { width, cap: 'round', offset: -(start * 100 + trim / 2), dashes: `${dash} ${100 - dash}` }
}

@Component({
  selector: 'cm-donut-chart', imports: [CmChartFrame], host: { style: 'display:block;min-width:0' },
  template: `
    <cm-chart-frame [title]="title()" [description]="description()" [legend]="slices()" [legendLayout]="legendLayout()"
      [legendPosition]="legendPosition()" [table]="table()" [empty]="!total()">
      <div class="cm-donut-chart" [attr.data-variant]="variant()">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          @for (slice of positive(); track $index) {
            <circle cx="50" cy="50" r="42" fill="none" pathLength="100" transform="rotate(-90 50 50)"
              [attr.stroke]="slice.color" [attr.stroke-width]="slice.stroke.width" [attr.stroke-linecap]="slice.stroke.cap"
              [attr.stroke-dashoffset]="slice.stroke.offset" [attr.stroke-dasharray]="slice.stroke.dashes">
              <title>{{ slice.label }} · {{ slice.amount }} · {{ slice.value }}</title>
            </circle>
          }
        </svg>
        <div class="cm-donut-chart__center"><strong>{{ valueFormat()(total()) }}</strong><span>{{ totalLabel() }}</span></div>
      </div>
    </cm-chart-frame>
  `,
})
export class CmDonutChart {
  readonly title = input<string>()
  readonly description = input<string>()
  readonly data = input.required<readonly CmDonutSegment[]>()
  readonly variant = input<'continuous' | 'segmented'>('continuous')
  readonly legendPosition = input<'header' | 'footer' | 'none'>('footer')
  readonly legendLayout = input<'inline' | 'list'>('inline')
  readonly totalLabel = input('Total')
  readonly valueFormat = input(number.format)
  readonly accessibleTableLabel = input<string>()
  private readonly segments = computed(() => this.data().filter(item => Number.isFinite(item.value) && item.value >= 0))
  protected readonly total = computed(() => this.segments().reduce((sum, item) => sum + item.value, 0))
  protected readonly slices = computed(() => {
    let start = 0
    const total = this.total()
    const segmented = this.variant() === 'segmented' && this.segments().filter(item => item.value > 0).length > 1
    return this.segments().map((item, index) => {
      const fraction = total ? item.value / total : 0
      const stroke = donutStroke(start, fraction, segmented)
      start += fraction
      return { label: item.label, amount: this.valueFormat()(item.value), value: percent.format(fraction), fraction, stroke,
        color: item.color ?? cmChartColor(item.tone ?? chartTones[index % chartTones.length]) }
    })
  })
  protected readonly positive = computed(() => this.slices().filter(item => item.fraction > 0))
  protected readonly table = computed<CmChartTable>(() => ({
    caption: this.accessibleTableLabel() ?? this.title() ?? 'Distribuição por categoria', headers: ['Categoria', 'Valor', 'Percentual'],
    rows: this.slices().map(item => [item.label, item.amount, item.value]),
  }))
}

export type CmComparisonPoint = { id?: string; label: string; description?: string; left: number | null; right: number | null }
export type CmComparisonAxis = {
  label: string; tone?: string; color?: string; area?: boolean; domain?: readonly [number, number];
  valueFormat?: (value: number) => string; tickFormat?: (value: number) => string;
}
type Coordinate = { x: number; y: number }

function plotPath(points: readonly Coordinate[], smooth: boolean) {
  const first = points[0]
  if (!first) return ''
  const start = `M${first.x} ${first.y}`
  if (points.length === 1) return start + 'l0 0'
  return start + points.slice(1).map((point, index) => {
    if (!smooth) return ` L${point.x} ${point.y}`
    const previous = points[index]
    const midpoint = (previous.x + point.x) / 2
    return ` C${midpoint} ${previous.y}, ${midpoint} ${point.y}, ${point.x} ${point.y}`
  }).join('')
}

function valid(value: number | null): value is number { return value !== null && Number.isFinite(value) }

function plotSeries(data: readonly CmComparisonPoint[], key: 'left' | 'right', axis: CmComparisonAxis, smooth: boolean) {
  const bounds = axis.domain?.every(Number.isFinite) && axis.domain[0] < axis.domain[1] ? axis.domain : [0, 0]
  let min = Math.min(0, bounds[0])
  let max = Math.max(0, bounds[1])
  for (const point of data) {
    const value = point[key]
    if (valid(value)) { min = Math.min(min, value); max = Math.max(max, value) }
  }
  const range = max - min || 1
  const baseline = 100 * (1 + min / range)
  const runs: Coordinate[][] = [[]]
  data.forEach((point, index) => {
    const value = point[key]
    if (valid(value)) runs.at(-1)?.push({ x: data.length > 1 ? index * 100 / (data.length - 1) : 50, y: 100 * (1 - (value - min) / range) })
    else if (runs.at(-1)?.length) runs.push([])
  })
  const paths = runs.filter(run => run.length).map(run => ({ run, path: plotPath(run, smooth) }))
  const tick = axis.tickFormat ?? axis.valueFormat ?? number.format
  return {
    color: axis.color ?? cmChartColor(axis.tone ?? (key === 'left' ? 'primary' : 'info')),
    path: paths.map(item => item.path).join(' '),
    area: axis.area ? paths.filter(item => item.run.length > 1)
      .map(({ run, path }) => `${path} L${run.at(-1)?.x} ${baseline} L${run[0].x} ${baseline} Z`).join(' ') : '',
    labels: ticks.map(value => tick(min + range * value)),
  }
}

let chartId = 0

@Component({
  selector: 'cm-comparison-line-chart', imports: [CmChartFrame], host: { style: 'display:block;min-width:0' },
  template: `
    <cm-chart-frame [title]="title()" [description]="description()" [legend]="legend()" [legendPosition]="legendPosition()"
      [table]="table()" [empty]="empty()">
      <div class="cm-comparison-chart">
        <div class="cm-comparison-chart__axis" aria-hidden="true">@for (tick of left().labels; track $index) { <span>{{ tick }}</span> }</div>
        <div class="cm-comparison-chart__plot" [style.height.px]="height()" role="slider" tabindex="0" [attr.aria-label]="label()"
          aria-valuemin="1" [attr.aria-valuemax]="data().length" [attr.aria-valuenow]="index() + 1" [attr.aria-valuetext]="pointText()"
          (pointermove)="inspectPointer($event)" (pointerdown)="inspectPointer($event)" (pointerleave)="stopPointer($event)"
          (focus)="inspecting.set(true)" (blur)="inspecting.set(false)" (keydown)="inspectKey($event)">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            @for (series of [left(), right()]; track $index) {
              @if (series.area) {
                <defs><linearGradient [attr.id]="gradientId + '-' + $index" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
                  <stop offset="0" [attr.stop-color]="series.color" stop-opacity=".22" />
                  <stop offset="1" [attr.stop-color]="series.color" stop-opacity=".035" />
                </linearGradient></defs>
                <path [attr.d]="series.area" [attr.fill]="'url(#' + gradientId + '-' + $index + ')'" />
              }
            }
            @for (tick of ticks; track tick) {
              <line x1="0" x2="100" [attr.y1]="tick * 100" [attr.y2]="tick * 100" class="cm-comparison-chart__grid" vector-effect="non-scaling-stroke" />
            }
            <path [attr.d]="left().path" fill="none" [attr.stroke]="left().color" stroke-width="2" stroke-linecap="round" vector-effect="non-scaling-stroke" />
            <path [attr.d]="right().path" fill="none" [attr.stroke]="right().color" stroke-width="2" stroke-linecap="round" stroke-dasharray="6 3" vector-effect="non-scaling-stroke" />
            @if (inspecting()) { <line [attr.x1]="position()" [attr.x2]="position()" y1="0" y2="100" class="cm-comparison-chart__cursor" vector-effect="non-scaling-stroke" /> }
          </svg>
          @if (inspecting() && point(); as current) {
            <div class="cm-comparison-chart__tooltip" [attr.data-side]="position() < 50 ? 'end' : 'start'" aria-hidden="true">
              <strong>{{ current.description ?? current.label }}</strong>
              <span>{{ leftAxis().label }} · {{ formatted(current.left, leftAxis()) }}</span>
              <span>{{ rightAxis().label }} · {{ formatted(current.right, rightAxis()) }}</span>
            </div>
          }
        </div>
        <div class="cm-comparison-chart__axis" aria-hidden="true">@for (tick of right().labels; track $index) { <span>{{ tick }}</span> }</div>
        <div class="cm-comparison-chart__labels" aria-hidden="true">
          @for (item of labels(); track $index) { <span [style.left.%]="item.position" [attr.data-compact]="item.compact">{{ item.label }}</span> }
        </div>
      </div>
    </cm-chart-frame>
  `,
})
export class CmComparisonLineChart {
  readonly title = input<string>()
  readonly description = input<string>()
  readonly data = input.required<readonly CmComparisonPoint[]>()
  readonly leftAxis = input.required<CmComparisonAxis>()
  readonly rightAxis = input.required<CmComparisonAxis>()
  readonly curve = input<'linear' | 'smooth'>('linear')
  readonly xLabels = input<'compact' | 'responsive'>('compact')
  readonly legendPosition = input<'header' | 'footer' | 'none'>('footer')
  readonly height = input(192)
  readonly accessibleTableLabel = input<string>()
  protected readonly gradientId = 'cm-comparison-fill-' + ++chartId
  protected readonly ticks = ticks
  protected readonly inspecting = signal(false)
  private readonly cursor = signal(0)
  protected readonly empty = computed(() => !this.data().some(item => valid(item.left) || valid(item.right)))
  protected readonly left = computed(() => plotSeries(this.data(), 'left', this.leftAxis(), this.curve() === 'smooth'))
  protected readonly right = computed(() => plotSeries(this.data(), 'right', this.rightAxis(), this.curve() === 'smooth'))
  protected readonly label = computed(() => `${this.leftAxis().label} e ${this.rightAxis().label}`)
  protected readonly index = computed(() => Math.max(0, Math.min(this.data().length - 1, this.cursor())))
  protected readonly position = computed(() => this.data().length > 1 ? this.index() * 100 / (this.data().length - 1) : 50)
  protected readonly point = computed(() => this.data()[this.index()])
  protected readonly pointText = computed(() => {
    const item = this.point()
    return item ? `${item.description ?? item.label} · ${this.leftAxis().label}: ${this.formatted(item.left, this.leftAxis())} · ${this.rightAxis().label}: ${this.formatted(item.right, this.rightAxis())}` : ''
  })
  protected readonly legend = computed<CmChartLegendItem[]>(() => [
    { label: this.leftAxis().label, color: this.left().color, marker: this.legendPosition() === 'header' ? 'line' : undefined },
    { label: this.rightAxis().label, color: this.right().color, marker: this.legendPosition() === 'header' ? 'dashed' : undefined },
  ])
  protected readonly table = computed<CmChartTable>(() => ({
    caption: this.accessibleTableLabel() ?? this.title() ?? this.label(), headers: ['Ponto', this.leftAxis().label, this.rightAxis().label],
    rows: this.data().map(item => [item.description ?? item.label, this.formatted(item.left, this.leftAxis()), this.formatted(item.right, this.rightAxis())]),
  }))
  protected readonly labels = computed(() => {
    const items = this.data()
    if (!items.length) return []
    const last = items.length - 1
    const middle = Math.floor(last / 2)
    const indices = new Set([0, middle, last])
    if (this.xLabels() === 'responsive') {
      const count = Math.min(items.length, 8)
      for (let i = 1; i < count - 1; i++) indices.add(i === Math.floor((count - 1) / 2) ? middle : Math.round(i * last / (count - 1)))
    }
    return [...indices].sort((a, b) => a - b).map(index => ({
      label: items[index].label, position: last ? index * 100 / last : 50, compact: index === 0 || index === middle || index === last,
    }))
  })

  protected formatted(value: number | null, axis: CmComparisonAxis) { return valid(value) ? (axis.valueFormat ?? number.format)(value) : '—' }

  protected inspectPointer(event: PointerEvent) {
    if (!(event.currentTarget instanceof HTMLElement)) return
    const bounds = event.currentTarget.getBoundingClientRect()
    if (!bounds.width) return
    const position = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width))
    this.cursor.set(Math.round(position * (this.data().length - 1)))
    this.inspecting.set(true)
  }

  protected stopPointer(event: PointerEvent) {
    if (event.currentTarget instanceof HTMLElement && event.currentTarget !== event.currentTarget.ownerDocument.activeElement) this.inspecting.set(false)
  }

  protected inspectKey(event: KeyboardEvent) {
    const cursor = this.index()
    const limits = { ArrowRight: cursor + 1, ArrowUp: cursor + 1, ArrowLeft: cursor - 1, ArrowDown: cursor - 1, Home: 0, End: this.data().length - 1 }
    if (event.key === 'Escape') { event.preventDefault(); this.inspecting.set(false); return }
    if (!Object.hasOwn(limits, event.key)) return
    event.preventDefault()
    this.cursor.set(Math.max(0, Math.min(this.data().length - 1, limits[event.key as keyof typeof limits])))
    this.inspecting.set(true)
  }
}

export type CmBarChartDataPoint = { id?: string; label: string; value: number; tone?: string; color?: string }

@Component({
  selector: 'cm-bar-chart', imports: [CmChartFrame], host: { style: 'display:block;min-width:0' },
  template: `
    <cm-chart-frame [title]="title()" [description]="description()" [legend]="legendItems()" [legendLayout]="legendLayout()"
      [legendPosition]="legendPosition()" [table]="table()" [empty]="!data().length" [loading]="loading()">
      @if (orientation() === 'horizontal') {
        <div class="cm-bar-chart cm-bar-chart--horizontal">
          @for (bar of bars(); track $index) {
            <div class="cm-bar-chart__row">
              <div class="cm-bar-chart__row-header"><span class="cm-bar-chart__label">{{ bar.label }}</span>
                @if (showValues()) { <span class="cm-bar-chart__value">{{ bar.formatted }}</span> }
              </div>
              <div class="cm-bar-chart__track" [style.height.px]="trackHeight()">
                <div class="cm-bar-chart__fill cm-bar-chart__fill--horizontal" [attr.title]="bar.tooltip" [style.width.%]="bar.percent" [style.backgroundColor]="bar.color"></div>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="cm-bar-chart cm-bar-chart--vertical" [style.height.px]="height()">
          @if (showGrid()) {
            <div class="cm-bar-chart__grid" aria-hidden="true">@for (line of ticks; track line) { <div class="cm-bar-chart__grid-line"></div> }</div>
          }
          <div class="cm-bar-chart__plot">
            @for (bar of bars(); track $index) {
              <div class="cm-bar-chart__column">
                <div class="cm-bar-chart__column-inner">
                  @if (showValues()) { <span class="cm-bar-chart__value cm-bar-chart__value--above">{{ bar.formatted }}</span> }
                  <div class="cm-bar-chart__fill cm-bar-chart__fill--vertical" [attr.title]="bar.tooltip" [style.height.%]="bar.percent" [style.backgroundColor]="bar.color"></div>
                </div>
                <span class="cm-bar-chart__label cm-bar-chart__label--axis">{{ bar.label }}</span>
              </div>
            }
          </div>
        </div>
      }
    </cm-chart-frame>
  `,
})
export class CmBarChart {
  readonly data = input.required<readonly CmBarChartDataPoint[]>()
  readonly title = input<string>()
  readonly description = input<string>()
  readonly height = input(300)
  readonly orientation = input<'horizontal' | 'vertical'>('vertical')
  readonly barThickness = input<string | number>()
  readonly showValues = input(true, { transform: booleanAttribute })
  readonly showGrid = input(true, { transform: booleanAttribute })
  readonly loading = input(false, { transform: booleanAttribute })
  readonly valueFormat = input<(value: number, bar: CmBarChartDataPoint) => string>(value => value.toLocaleString('pt-BR'))
  readonly tooltipFormat = input<(bar: CmBarChartDataPoint) => string>()
  readonly legend = input<boolean | readonly CmChartLegendItem[]>(false)
  readonly legendLayout = input<'inline' | 'list'>('inline')
  readonly legendPosition = input<'header' | 'footer' | 'none'>('footer')
  readonly accessibleTableLabel = input<string>()
  protected readonly ticks = ticks
  protected readonly trackHeight = computed(() => {
    const value = this.barThickness()
    if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : undefined
    return value ? thickness[value] : undefined
  })
  protected readonly bars = computed(() => {
    const data = this.data().filter(bar => Number.isFinite(bar.value))
    const max = data.reduce((maximum, bar) => Math.max(maximum, bar.value), 1)
    return data.map(bar => ({ ...bar, percent: 100 * Math.max(0, bar.value) / max,
      formatted: this.valueFormat()(bar.value, bar), tooltip: this.tooltipFormat()?.(bar), color: bar.color ?? cmChartColor(bar.tone) }))
  })
  protected readonly legendItems = computed(() => {
    const value = this.legend()
    if (typeof value !== 'boolean') return value
    if (!value) return []
    return this.bars().map(bar => ({ label: bar.label, color: bar.color, value: bar.value.toLocaleString('pt-BR') }))
  })
  protected readonly table = computed<CmChartTable>(() => ({
    caption: this.accessibleTableLabel() ?? this.title() ?? 'Dados do gráfico de barras', headers: ['Categoria', 'Valor'],
    rows: this.bars().map(bar => [bar.label, bar.formatted]),
  }))
}

export type CmRatioSegment = { id?: string; label?: string; valueLabel?: string; value: number; tone?: string; min?: number; max?: number }

@Component({
  selector: 'cm-ratio-bar',
  host: { class: 'cm-ratio-bar', '[attr.data-disabled]': 'disabled() ? "" : null', '[style.--cm-ratio-bar-height]': 'cssHeight()' },
  template: `
    <div #track class="cm-ratio-bar__track">
      @for (segment of segments(); track $index) {
        <div [class]="'cm-ratio-bar__segment cm-ratio-bar__segment--tone-' + (segment.tone ?? ($index ? 'primary' : 'default'))"
          [style.width.%]="percentage(segment.value)">
          @if (segment.label) { <span class="cm-ratio-bar__segment-label">{{ segment.label }}</span> }
          @if (segment.valueLabel) { <span class="cm-ratio-bar__segment-value">{{ segment.valueLabel }}</span> }
        </div>
      }
      @if (bounds(); as limits) {
        <div role="slider" class="cm-ratio-bar__handle" [attr.tabindex]="disabled() ? -1 : 0" [attr.aria-label]="handleLabel()"
          aria-orientation="horizontal" [attr.aria-valuemin]="limits.lower" [attr.aria-valuemax]="limits.upper" [attr.aria-valuenow]="limits.left.value"
          [attr.aria-disabled]="disabled() || null" [attr.aria-valuetext]="handleValueText()" [style.left.%]="percentage(offset() + limits.left.value)"
          (keydown)="handleKey($event)" (pointerdown)="start($event)" (pointermove)="move($event)"
          (pointerup)="stop($event)" (pointercancel)="stop($event)" (lostpointercapture)="stop($event)"></div>
      }
    </div>
  `,
})
export class CmRatioBar {
  readonly segments = input.required<readonly CmRatioSegment[]>()
  readonly handleIndex = input<number>()
  readonly handleLabel = input('Divisão')
  readonly height = input<string | number>()
  readonly step = input<number>()
  readonly disabled = input(false, { transform: booleanAttribute })
  readonly valueText = input<(values: number[]) => string>()
  readonly valuesChange = output<number[]>()
  private readonly track = viewChild<ElementRef<HTMLElement>>('track')
  private pointer = -1
  private readonly total = computed(() => this.segments().reduce((sum, item) => sum + Math.max(0, item.value), 0))
  protected readonly cssHeight = computed(() => typeof this.height() === 'number' ? `${this.height()}px` : this.height())
  protected readonly handleValueText = computed(() => this.valueText()?.(this.segments().map(item => item.value)))
  protected readonly offset = computed(() => this.segments().slice(0, this.handleIndex() ?? 0).reduce((sum, item) => sum + Math.max(0, item.value), 0))
  protected readonly bounds = computed(() => {
    const index = this.handleIndex()
    if (index === undefined) return undefined
    const left = this.segments()[index]
    const right = this.segments()[index + 1]
    if (!left || !right) return undefined
    const pair = left.value + right.value
    const lower = Math.max(left.min ?? 0, pair - (right.max ?? pair))
    const upper = Math.max(lower, Math.min(left.max ?? pair, pair - (right.min ?? 0)))
    return { index, left, pair, lower, upper }
  })

  protected percentage(value: number) { return this.total() > 0 ? Math.max(0, value) / this.total() * 100 : 0 }

  private commit(value: number) {
    const bounds = this.bounds()
    if (!bounds || this.disabled()) return
    const next = Math.min(bounds.upper, Math.max(bounds.lower, value))
    if (next === bounds.left.value) return
    const result = this.segments().map(item => item.value)
    result[bounds.index] = next
    result[bounds.index + 1] = bounds.pair - next
    this.valuesChange.emit(result)
  }

  protected handleKey(event: KeyboardEvent) {
    const bounds = this.bounds()
    if (!bounds || this.disabled()) return
    const step = this.step() ?? Math.max(bounds.pair / 100, 1)
    const current = bounds.left.value
    const keys = { ArrowRight: current + step, ArrowUp: current + step, ArrowLeft: current - step, ArrowDown: current - step,
      PageUp: current + 10 * step, PageDown: current - 10 * step, Home: bounds.lower, End: bounds.upper }
    if (!Object.hasOwn(keys, event.key)) return
    event.preventDefault()
    this.commit(keys[event.key as keyof typeof keys])
  }

  protected start(event: PointerEvent) {
    if (this.disabled() || !(event.currentTarget instanceof HTMLElement)) return
    this.pointer = event.pointerId
    try { event.currentTarget.setPointerCapture?.(event.pointerId) } catch { /* Synthetic events may lack pointer capture. */ }
    event.currentTarget.focus()
    event.preventDefault()
  }

  protected move(event: PointerEvent) {
    if (this.pointer !== event.pointerId) return
    const rect = this.track()?.nativeElement.getBoundingClientRect()
    if (!rect?.width) return
    const cursor = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    this.commit(cursor * this.total() - this.offset())
  }

  protected stop(event: PointerEvent) { if (this.pointer === event.pointerId) this.pointer = -1 }
}
