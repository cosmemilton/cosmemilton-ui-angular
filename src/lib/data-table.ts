import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, linkedSignal, model, output, signal, TemplateRef, viewChild } from '@angular/core'
import { RouterLink } from '@angular/router'
import { CmButton } from './button'
import { CmIcon } from './icon'
import { CmEmpty } from './page-primitives'
import { CmAvatar } from './detail-primitives'
import { CmCheckbox } from './form-primitives'
import { CmDialog, CmDialogFooter } from './interaction-primitives'

export type CmCellDetail = { label: string; tone?: string; detail?: string; avatar?: string; href?: string; action?: string; actionLabel?: string; sortValue?: string | number }
export type CmCellValue = string | number | boolean | CmCellDetail
export type CmTableRow = { id: string | number; cells: Record<string, CmCellValue> }
export type CmColumn = { id: string; label: string; align?: 'left' | 'center' | 'right'; sortable?: boolean; hideable?: boolean }
export type CmRowAction = { id: string; label: string; icon?: string }
const defaultSizes = [5, 10, 20, 50]
const compare = new Intl.Collator('pt-BR', { numeric: true })

@Component({
  selector: 'cm-data-table',
  imports: [CmAvatar, CmButton, CmCheckbox, CmDialog, CmDialogFooter, CmEmpty, CmIcon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:block;min-width:0' },
  template: `
    <div class="cm-data-table data-table-root cm-data-table--full-width" [class.cm-density-compact]="density() === 'compact'" [class.cm-data-table--empty]="showEmpty()">
      @if (title() || description()) {
        <div class="cm-data-table__top"><div class="cm-data-table__heading">
          @if (title()) { <h3 class="cm-data-table__title">{{ title() }}</h3> }
          @if (description()) { <p class="cm-data-table__description">{{ description() }}</p> }
        </div></div>
      }
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
              @if (tableKey()) {
                <th class="cm-data-table__toggle-cell"><button type="button" class="cm-data-table__column-button" title="Configurar colunas"
                  aria-label="Configurar colunas" (click)="columnsOpen.set(true)">
                  <cm-icon name="sliders-horizontal" [size]="14" />
                  @if (hiddenCount()) { <span class="cm-data-table__hidden-count">{{ hiddenCount() }}</span> }
                </button></th>
              }
              @for (column of visibleColumns(); track column.id) {
                <th scope="col" class="cm-data-table__header"
                  [attr.aria-sort]="sortKey() === column.id ? descending() ? 'descending' : 'ascending' : null"
                  [class]="'cm-data-table__cell--' + (column.align ?? 'left')" [class.cm-data-table__header--sortable]="column.sortable !== false">
                  @if (column.sortable !== false) {
                    <button class="cm-data-table__header-content" [class]="column.align ? 'cm-data-table__header-content--' + column.align : ''"
                      type="button" (click)="sort(column.id)">
                      {{ column.label }} <cm-icon class="cm-data-table__sort-icon" [class.cm-data-table__sort-icon--inactive]="sortKey() !== column.id"
                        [name]="sortKey() !== column.id ? 'arrow-up-down' : descending() ? 'arrow-down' : 'arrow-up'" [size]="12" />
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
                @if (tableKey()) { <td class="cm-data-table__toggle-spacer"></td> }
                @for (column of visibleColumns(); track column.id) {
                  <td class="cm-data-table__cell" [class]="column.align ? 'cm-data-table__cell--' + column.align : ''">
                    @if (detail(row.cells[column.id]); as cell) {
                      @if (cell.action) {
                        <button cmButton type="button" variant="outline" size="sm" [attr.aria-label]="cell.actionLabel ?? cell.label" (click)="rowAction.emit({action:cell.action,row})">{{ cell.label }}</button>
                      } @else if (cell.href) {
                        <a class="cm-link cm-link--tone-primary" [routerLink]="cell.href">{{ cell.label }}</a>
                      } @else if (cell.tone) {
                        <span [class]="'cm-badge cm-badge--soft cm-badge--' + cell.tone">{{ cell.label }}</span>
                      } @else if (cell.avatar && !cell.detail) {
                        <div class="cm-row" data-align="center" style="--cm-layout-gap:var(--space-xs)">
                          <cm-avatar size="xs" [fallback]="cell.avatar" aria-hidden="true" />{{ cell.label }}
                        </div>
                      } @else if (cell.detail) {
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
              <tr><td class="cm-data-table__cell" [attr.colspan]="visibleColumns().length + (actions().length ? 1 : 0) + (tableKey() ? 1 : 0)">{{ emptyMessage() }}</td></tr>
            }
          </tbody>
          @if (totals(); as summary) {
            <tfoot class="cm-data-table__footer">
              <tr>
                @if (tableKey()) { <td class="cm-data-table__toggle-spacer"></td> }
                @for (column of visibleColumns(); track column.id) {
                @if ($first) {
                  <th scope="row" class="cm-data-table__cell" [class]="'cm-data-table__cell--' + (column.align ?? 'left')">{{ summary[columns().indexOf(column)] }}</th>
                } @else {
                  <td class="cm-data-table__cell" [class]="'cm-data-table__cell--' + (column.align ?? 'left')">{{ summary[columns().indexOf(column)] }}</td>
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
    @if (tableKey()) {
      <cm-dialog title="Colunas visíveis" [(open)]="columnsOpen">
        <div class="cm-data-table__columns-grid">
          @for (column of columns(); track column.id) {
            @if (column.hideable !== false) {
              <div class="cm-data-table__column-option">
                <cm-checkbox [label]="column.label" [checked]="!hidden().includes(column.id)" (checkedChange)="setVisibility(column.id, $event)" />
              </div>
            }
          }
        </div>
        <div cmDialogFooter class="cm-data-table__dialog-footer">
          <button cmButton type="button" variant="surface" tone="primary" size="sm" (click)="resetColumns()">Restaurar padrão</button>
          <button cmButton type="button" variant="soft" tone="primary" size="sm" (click)="columnsOpen.set(false)">Fechar</button>
        </div>
      </cm-dialog>
    }
  `,
})
export class CmDataTable {
  readonly columns = input.required<readonly CmColumn[]>()
  readonly rows = input.required<readonly CmTableRow[]>()
  readonly pageSize = input(10)
  readonly pageSizes = input<readonly number[]>(defaultSizes)
  readonly page = model(1)
  readonly label = input('Registros')
  readonly title = input<string>()
  readonly description = input<string>()
  readonly tableKey = input<string>()
  readonly defaultSortKey = input('')
  readonly defaultSortDirection = input<'asc' | 'desc'>('asc')
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
  protected readonly sortKey = linkedSignal(this.defaultSortKey)
  protected readonly descending = linkedSignal(() => this.defaultSortDirection() === 'desc')
  protected readonly columnsOpen = signal(false)
  protected readonly hidden = signal<string[]>([])
  protected readonly visibleColumns = computed(() => this.columns().filter(column => column.hideable === false || !this.hidden().includes(column.id)))
  protected readonly hiddenCount = computed(() => this.columns().length - this.visibleColumns().length)
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
      const id = this.tableKey()
      if (!id || typeof window === 'undefined') { this.hidden.set([]); return }
      const key = 'cm-table:' + id
      const read = () => {
        try {
          const stored: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]')
          this.hidden.set(Array.isArray(stored) ? stored.filter(value => typeof value === 'string') : [])
        } catch { this.hidden.set([]) }
      }
      const onStorage = (event: StorageEvent) => { if (!event.key || event.key === key) read() }
      const onLocal = (event: Event) => { if ((event as CustomEvent).detail?.storageKey === key) read() }
      read()
      window.addEventListener('storage', onStorage)
      window.addEventListener('cm-table-preference', onLocal)
      onCleanup(() => {
        window.removeEventListener('storage', onStorage)
        window.removeEventListener('cm-table-preference', onLocal)
      })
    })
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
  protected setVisibility(id: string, visible: boolean) {
    const hidden = this.hidden().filter(value => value !== id)
    if (!visible) hidden.push(id)
    this.saveHidden(hidden)
  }
  protected resetColumns() {
    this.saveHidden([])
    this.columnsOpen.set(false)
  }
  private saveHidden(hidden: string[]) {
    this.hidden.set(hidden)
    const key = 'cm-table:' + this.tableKey()
    try {
      if (hidden.length) window.localStorage.setItem(key, JSON.stringify(hidden))
      else window.localStorage.removeItem(key)
      window.dispatchEvent(new CustomEvent('cm-table-preference', { detail: { storageKey: key } }))
    } catch { /* The selections still apply to this table when storage is unavailable. */ }
  }
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
