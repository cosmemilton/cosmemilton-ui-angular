import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, model, output, signal, TemplateRef, viewChild } from '@angular/core'
import { RouterLink } from '@angular/router'
import { CmButton } from './button'
import { CmIcon } from './icon'
import { CmEmpty } from './page-primitives'

export type CmCellDetail = { label: string; tone?: string; detail?: string; avatar?: string; href?: string; action?: string; actionLabel?: string; sortValue?: string | number }
export type CmCellValue = string | number | boolean | CmCellDetail
export type CmTableRow = { id: string | number; cells: Record<string, CmCellValue> }
export type CmColumn = { id: string; label: string; align?: 'left' | 'center' | 'right'; sortable?: boolean }
export type CmRowAction = { id: string; label: string; icon?: string }
const defaultSizes = [5, 10, 20, 50]
const compare = new Intl.Collator('pt-BR', { numeric: true })

@Component({
  selector: 'cm-data-table',
  imports: [CmButton, CmEmpty, CmIcon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:block;min-width:0' },
  template: `
    <div class="cm-data-table data-table-root" [class.cm-density-compact]="density() === 'compact'" [class.cm-data-table--empty]="showEmpty()">
      @if (showEmpty()) {
        <div class="cm-data-table-empty">
          <div cmEmpty class="cm-data-table-empty__content" [title]="emptyTitle() ?? emptyMessage()" [description]="emptyDescription()"
            [icon]="emptyIcon()" [actionLabel]="emptyActionLabel()" (action)="emptyAction.emit()"></div>
        </div>
      } @else {
      <div class="cm-data-table__viewport"><div #scrollArea class="cm-data-table__scroll"
        [attr.role]="hasOverflow() ? 'region' : null" [attr.tabindex]="hasOverflow() ? 0 : null" [attr.aria-label]="hasOverflow() ? label() : null">
        <table class="cm-data-table__table" [attr.aria-label]="label()" [style.min-width.px]="minimumWidth() || null">
          <thead class="cm-data-table__head">
            <tr>
              @for (column of columns(); track column.id) {
                <th scope="col" class="cm-data-table__header"
                  [attr.aria-sort]="sortKey() === column.id ? descending() ? 'descending' : 'ascending' : null"
                  [class]="'cm-data-table__cell--' + (column.align ?? 'left')" [class.cm-data-table__header--sortable]="column.sortable !== false">
                  @if (column.sortable !== false) {
                    <button class="cm-data-table__column-button" type="button" style="white-space:nowrap" (click)="sort(column.id)">
                      {{ column.label }} <cm-icon [name]="sortKey() === column.id && descending() ? 'chevron-down' : 'chevron-up'" [size]="13" />
                    </button>
                  } @else { <span class="cm-data-table__header-content" [class]="column.align ? 'cm-data-table__header-content--' + column.align : ''">{{ column.label }}</span> }
                </th>
              }
              @if (actions().length) { <th scope="col" class="cm-data-table__header">Ações</th> }
            </tr>
          </thead>
          <tbody class="cm-data-table__body">
            @for (row of visible(); track row.id) {
              <tr class="cm-data-table__row cm-data-table__row--hoverable" [class.cm-data-table__row--zebra]="$odd">
                @for (column of columns(); track column.id) {
                  <td class="cm-data-table__cell" [class]="column.align ? 'cm-data-table__cell--' + column.align : ''">
                    @if (detail(row.cells[column.id]); as cell) {
                      @if (cell.action) {
                        <button cmButton type="button" variant="outline" size="sm" [attr.aria-label]="cell.actionLabel ?? cell.label" (click)="rowAction.emit({action:cell.action,row})">{{ cell.label }}</button>
                      } @else if (cell.href) {
                        <a class="cm-link cm-link--tone-primary" [routerLink]="cell.href">{{ cell.label }}</a>
                      } @else if (cell.tone) {
                        <span [class]="'cm-badge cm-badge--soft cm-badge--' + cell.tone">{{ cell.label }}</span>
                      } @else if (cell.detail || cell.avatar) {
                        <div class="cm-row" data-align="center" style="--cm-layout-gap:.5rem">
                          @if (cell.avatar) { <span class="aurora-avatar">{{ cell.avatar }}</span> }
                          <div class="cm-stack" style="--cm-layout-gap:.15rem">
                            <strong class="cm-text cm-text--sm cm-text--semibold">{{ cell.label }}</strong>
                            @if (cell.detail) { <small class="cm-text cm-text--xs cm-text--muted">{{ cell.detail }}</small> }
                          </div>
                        </div>
                      } @else { {{ cell.label }} }
                    } @else { {{ text(row.cells[column.id]) }} }
                  </td>
                }
                @if (actions().length) {
                  <td class="cm-data-table__cell">
                    <div class="cm-row" style="--cm-layout-gap:.25rem">
                      @for (action of actions(); track action.id) {
                        <button cmButton type="button" variant="ghost" size="sm" [iconOnly]="!!action.icon"
                          [attr.aria-label]="action.label" [attr.title]="action.label" (click)="rowAction.emit({action:action.id, row})">
                          @if (action.icon) { <cm-icon [name]="action.icon" [size]="15" /> } @else { {{ action.label }} }
                        </button>
                      }
                    </div>
                  </td>
                }
              </tr>
            } @empty {
              <tr><td class="cm-data-table__cell" [attr.colspan]="columns().length + (actions().length ? 1 : 0)">{{ emptyMessage() }}</td></tr>
            }
          </tbody>
          @if (totals(); as summary) {
            <tfoot class="cm-data-table__footer">
              <tr>@for (column of columns(); track column.id) {
                @if ($first) {
                  <th scope="row" class="cm-data-table__cell" [class]="'cm-data-table__cell--' + (column.align ?? 'left')">{{ summary[$index] }}</th>
                } @else {
                  <td class="cm-data-table__cell" [class]="'cm-data-table__cell--' + (column.align ?? 'left')">{{ summary[$index] }}</td>
                }
              }
              @if (actions().length) { <td class="cm-data-table__cell"></td> }
              </tr>
            </tfoot>
          }
        </table>
      </div></div>
      @if (pageSize() > 0 && rows().length > 0) {
        <div class="cm-data-table__foot cm-data-table__pagination-cell">
          <div class="cm-data-table__pagination">
            <div class="cm-data-table__pagination-group">
              <span class="cm-data-table__pagination-text">Linhas por página:</span>
              <select class="cm-data-table__page-size" aria-label="Linhas por página" [value]="effectiveSize()" (change)="changeSize($event)">
                @for (size of pageSizes(); track size) { <option [value]="size" [selected]="size === effectiveSize()">{{ size }}</option> }
              </select>
              <span class="cm-data-table__pagination-text">{{ offset() + 1 }}-{{ offset() + visible().length }} de {{ rows().length }}</span>
            </div>
            <div class="cm-pagination cm-pagination--compact">
              <button cmButton type="button" size="sm" variant="outline" [disabled]="currentPage() <= 1" (click)="page.set(currentPage() - 1)">Anterior</button>
              <span class="cm-pagination__summary">Página {{ currentPage() }} de {{ pageCount() }}</span>
              <button cmButton type="button" size="sm" variant="outline" [disabled]="currentPage() >= pageCount()" (click)="page.set(currentPage() + 1)">Próxima</button>
            </div>
          </div>
        </div>
      }
      }
    </div>
  `,
})
export class CmDataTable {
  readonly columns = input.required<readonly CmColumn[]>()
  readonly rows = input.required<readonly CmTableRow[]>()
  readonly pageSize = input(10)
  readonly pageSizes = input<readonly number[]>(defaultSizes)
  readonly page = model(1)
  readonly label = input('Registros')
  readonly density = input<'normal' | 'compact'>('normal')
  readonly minimumWidth = input(0)
  readonly totals = input<readonly string[] | null>(null)
  readonly emptyMessage = input('Nenhum registro encontrado.')
  readonly emptyTitle = input<string>()
  readonly emptyDescription = input<string>()
  readonly emptyIcon = input<TemplateRef<unknown>>()
  readonly emptyActionLabel = input<string>()
  readonly emptyAction = output<void>()
  readonly actions = input<readonly CmRowAction[]>([])
  readonly rowAction = output<{ action: string; row: CmTableRow }>()
  private readonly scrollArea = viewChild<ElementRef<HTMLDivElement>>('scrollArea')
  protected readonly hasOverflow = signal(false)
  protected readonly showEmpty = computed(() => !!this.emptyTitle() && this.rows().length === 0)
  protected readonly size = signal<number | null>(null)
  protected readonly sortKey = signal('')
  protected readonly descending = signal(false)
  protected readonly effectiveSize = computed(() => this.size() ?? this.pageSize())
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.rows().length / Math.max(1, this.effectiveSize()))))
  protected readonly currentPage = computed(() => Math.max(1, Math.min(this.page(), this.pageCount())))
  protected readonly offset = computed(() => (this.currentPage() - 1) * this.effectiveSize())
  protected readonly visible = computed(() => {
    const key = this.sortKey()
    const sign = this.descending() ? -1 : 1
    const values = key ? [...this.rows()].sort((a, b) => {
      const first = this.sortValue(a.cells[key])
      const second = this.sortValue(b.cells[key])
      return sign * (typeof first === 'number' && typeof second === 'number' ? first - second : compare.compare(this.text(first), this.text(second)))
    }) : this.rows()
    if (this.effectiveSize() <= 0) return values
    const offset = this.offset()
    return values.slice(offset, offset + this.effectiveSize())
  })

  constructor() {
    effect(onCleanup => {
      const area = this.scrollArea()?.nativeElement
      if (!area || typeof ResizeObserver === 'undefined') return
      const update = () => this.hasOverflow.set(area.scrollWidth > area.clientWidth + 1)
      const observer = new ResizeObserver(update)
      observer.observe(area)
      const table = area.querySelector('table')
      if (table) observer.observe(table)
      update()
      onCleanup(() => observer.disconnect())
    })
  }

  protected detail(value: CmCellValue | undefined) { return value !== null && typeof value === 'object' ? value : undefined }
  protected text(value: CmCellValue | undefined) { return this.detail(value)?.label ?? (value === undefined ? '—' : String(value)) }
  private sortValue(value: CmCellValue | undefined) { return this.detail(value)?.sortValue ?? (typeof value === 'number' ? value : this.text(value)) }

  protected sort(id: string) {
    this.descending.set(this.sortKey() === id && !this.descending())
    this.sortKey.set(id)
    this.page.set(1)
  }

  protected changeSize(event: Event) {
    this.size.set(Number((event.target as HTMLSelectElement).value))
    this.page.set(1)
  }
}
