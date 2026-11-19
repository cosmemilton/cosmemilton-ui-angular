import {
  afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef,
  ElementRef, forwardRef, inject, input, model, signal, viewChild,
} from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import { CmIcon } from './icon'

type Point = { x: number; y: number }
type Stroke = Point[]
const strokeWidth = 2.25
const imageDataUrl = /^data:image\/(png|jpeg|webp|gif|avif|bmp);base64,/i

function paintStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, width: number, height: number) {
  const [first, ...remaining] = stroke
  ctx.beginPath()
  if (!remaining.length) {
    ctx.arc(first.x * width, first.y * height, strokeWidth / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  ctx.moveTo(first.x * width, first.y * height)
  for (const point of remaining) ctx.lineTo(point.x * width, point.y * height)
  ctx.stroke()
}

function escapeAttribute(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

@Component({
  selector: 'cm-signature-pad',
  imports: [CmIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CmSignaturePad), multi: true }],
  host: { class: 'cm-signature-pad' },
  template: `
    <div #frame class="cm-signature-pad__frame" [class.cm-signature-pad__frame--disabled]="disabledState()" [style.height]="frameHeight()">
      <canvas #canvas class="cm-signature-pad__canvas" role="img"
        [attr.aria-label]="empty() ? ariaLabel() + ' (vazia)' : ariaLabel()"
        [style.color]="strokeColor() || null" [style.touch-action]="disabledState() ? 'auto' : null"
        (pointerdown)="beginStroke($event)" (pointermove)="extendStroke($event)" (pointerup)="endStroke($event)"
        (pointercancel)="endStroke($event)" (lostpointercapture)="endStroke($event)"></canvas>
      @if (empty()) {
        <span class="cm-signature-pad__placeholder" aria-hidden="true">{{ placeholder() }}</span>
      }
    </div>
    <div class="cm-signature-pad__footer">
      <span class="cm-sr-only" role="status" aria-live="polite">{{ statusMessage() }}</span>
      <button type="button" class="cm-signature-pad__clear" (click)="clear()" [disabled]="disabledState() || empty()">
        <cm-icon class="cm-signature-pad__clear-icon" name="eraser" [size]="16" />
        {{ clearLabel() }}
      </button>
    </div>
    @if (name()) {
      <input type="hidden" [name]="name()" [value]="renderedValue() ?? ''" [disabled]="disabledState()" />
    }
  `,
})
export class CmSignaturePad implements ControlValueAccessor {
  readonly height = input<number | string>(200)
  readonly name = input('')
  readonly strokeColor = input('')
  readonly placeholder = input('Assine aqui')
  readonly ariaLabel = input('Área de assinatura')
  readonly clearLabel = input('Limpar')
  readonly disabled = input(false, { transform: booleanAttribute })
  readonly value = model<string | null>(null)

  protected readonly empty = signal(true)
  protected readonly renderedValue = signal<string | null>(null)
  protected readonly statusMessage = signal('')
  protected readonly frameHeight = computed(() => {
    const height = this.height()
    return typeof height === 'number' ? `${height}px` : height
  })
  protected readonly disabledState = computed(() => this.disabled() || this.formDisabled())
  private readonly frame = viewChild<ElementRef<HTMLDivElement>>('frame')
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas')
  private readonly formValue = signal<string | null | undefined>(undefined)
  private readonly formDisabled = signal(false)
  private onChange: (value: string | null) => void = () => {}
  private onTouched: () => void = () => {}
  private size = { width: 0, height: 0, ratio: 1 }
  private strokes: Stroke[] = []
  private active: { id: number; stroke: Stroke } | null = null
  private baseImage: HTMLImageElement | null = null
  private pendingImage: HTMLImageElement | null = null
  private currentValue: string | null | undefined

  constructor() {
    afterRenderEffect(onCleanup => {
      const frame = this.frame()?.nativeElement
      const canvas = this.canvas()?.nativeElement
      const window = canvas?.ownerDocument.defaultView
      if (!frame || !canvas || !window) return

      const resize = () => {
        const width = frame.clientWidth
        const height = frame.clientHeight
        const ratio = window.devicePixelRatio || 1
        if (!width || !height || (width === this.size.width && height === this.size.height && ratio === this.size.ratio)) return
        canvas.width = Math.round(width * ratio)
        canvas.height = Math.round(height * ratio)
        this.size = { width, height, ratio }
        this.redraw(canvas)
      }
      resize()
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
      observer?.observe(frame)
      window.addEventListener('resize', resize)
      onCleanup(() => {
        observer?.disconnect()
        window.removeEventListener('resize', resize)
      })
    })

    afterRenderEffect(() => {
      const controlled = this.formValue()
      const value = controlled === undefined ? this.value() : controlled
      const canvas = this.canvas()?.nativeElement
      if (!canvas || value === this.currentValue) return
      this.currentValue = value
      this.loadValue(canvas, value)
    })

    afterRenderEffect(() => {
      this.strokeColor()
      const canvas = this.canvas()?.nativeElement
      if (canvas) this.redraw(canvas)
    })
    inject(DestroyRef).onDestroy(() => { this.pendingImage = null })
  }

  writeValue(value: unknown) {
    const normalized = typeof value === 'string' ? value : null
    this.formValue.set(normalized)
    const canvas = this.canvas()?.nativeElement
    if (canvas && this.active) {
      this.currentValue = normalized
      this.loadValue(canvas, normalized)
    }
  }

  registerOnChange(handler: (value: string | null) => void) { this.onChange = handler }
  registerOnTouched(handler: () => void) { this.onTouched = handler }
  setDisabledState(disabled: boolean) { this.formDisabled.set(disabled) }

  clear() {
    const canvas = this.canvas()?.nativeElement
    if (canvas) this.loadValue(canvas, null)
    this.publish(null, 'Assinatura removida.')
  }

  isEmpty() { return this.empty() }

  toDataURL(type = 'image/png', quality?: number): string | null {
    if (this.isEmpty()) return null
    const canvas = this.canvas()?.nativeElement
    return canvas && this.size.width && this.size.height ? canvas.toDataURL(type, quality) : this.renderedValue()
  }

  toSVG(): string | null {
    if (this.isEmpty()) return null
    const { width, height } = this.size
    const viewWidth = 1000
    const viewHeight = Math.round(viewWidth * (height || 1) / (width || 1)) || 1
    const color = escapeAttribute(this.canvasColor(this.canvas()?.nativeElement))
    const elements = [`<rect width="${viewWidth}" height="${viewHeight}" fill="#ffffff"/>`]
    if (this.baseImage) {
      elements.push(`<image href="${escapeAttribute(this.baseImage.src)}" width="${viewWidth}" height="${viewHeight}" preserveAspectRatio="none"/>`)
    }
    const strokes = this.active ? [...this.strokes, this.active.stroke] : this.strokes
    for (const stroke of strokes) {
      const [first] = stroke
      if (stroke.length === 1) {
        elements.push(`<circle cx="${(first.x * viewWidth).toFixed(2)}" cy="${(first.y * viewHeight).toFixed(2)}" r="${strokeWidth / 2}" fill="${color}"/>`)
        continue
      }
      const path = stroke.map((point, index) =>
        `${index ? 'L' : 'M'}${(point.x * viewWidth).toFixed(2)},${(point.y * viewHeight).toFixed(2)}`).join(' ')
      elements.push(`<path d="${path}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`)
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewWidth} ${viewHeight}" width="${viewWidth}" height="${viewHeight}">${elements.join('')}</svg>`
  }

  protected beginStroke(event: PointerEvent) {
    if (this.disabledState() || this.active || this.pendingImage || (event.pointerType === 'mouse' && event.button !== 0)) return
    const canvas = event.currentTarget as HTMLCanvasElement
    const ctx = canvas.getContext('2d')
    const { width, height } = this.size
    if (!ctx || !width || !height) return

    event.preventDefault()
    canvas.setPointerCapture(event.pointerId)
    const stroke = [this.point(canvas, event)]
    this.active = { id: event.pointerId, stroke }
    this.empty.set(false)
    this.configureStroke(ctx, canvas)
    paintStroke(ctx, stroke, width, height)
  }

  protected extendStroke(event: PointerEvent) {
    const active = this.active
    if (!active || active.id !== event.pointerId || this.disabledState()) return
    const canvas = event.currentTarget as HTMLCanvasElement
    const point = this.point(canvas, event)
    const previous = active.stroke[active.stroke.length - 1]
    if (point.x === previous.x && point.y === previous.y) return
    active.stroke.push(point)
    const ctx = canvas.getContext('2d')
    if (ctx) paintStroke(ctx, [previous, point], this.size.width, this.size.height)
  }

  protected endStroke(event: PointerEvent) {
    const active = this.active
    if (!active || active.id !== event.pointerId) return
    const canvas = event.currentTarget as HTMLCanvasElement
    if (event.type === 'pointerup') this.extendStroke(event)
    this.releasePointer(canvas)
    if (this.disabledState()) {
      this.empty.set(!this.baseImage && !this.strokes.length)
      this.redraw(canvas)
      return
    }
    this.strokes.push(active.stroke)
    this.publish(this.toDataURL(), 'Assinatura registrada.')
  }

  private point(canvas: HTMLCanvasElement, event: PointerEvent): Point {
    const rect = canvas.getBoundingClientRect()
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }
  }

  private publish(value: string | null, message: string) {
    this.currentValue = value
    this.renderedValue.set(value)
    this.statusMessage.set(message)
    if (this.formValue() !== undefined) {
      this.formValue.set(value)
      this.onChange(value)
    }
    this.value.set(value)
    this.onTouched()
  }

  private loadValue(canvas: HTMLCanvasElement, value: string | null) {
    this.releasePointer(canvas)
    this.strokes = []
    this.baseImage = this.pendingImage = null
    this.empty.set(true)
    this.renderedValue.set(null)
    this.statusMessage.set('')
    this.redraw(canvas)
    if (!value || !imageDataUrl.test(value)) return

    const image = canvas.ownerDocument.createElement('img')
    this.pendingImage = image
    image.onload = () => {
      if (this.pendingImage !== image) return
      this.pendingImage = null
      this.baseImage = image
      this.empty.set(false)
      this.renderedValue.set(value)
      this.redraw(canvas)
    }
    image.onerror = () => {
      if (this.pendingImage === image) this.pendingImage = null
    }
    image.src = value
  }

  private releasePointer(canvas: HTMLCanvasElement) {
    const id = this.active?.id
    this.active = null
    if (id !== undefined && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id)
  }

  private canvasColor(canvas: HTMLCanvasElement | undefined) {
    return canvas?.ownerDocument.defaultView?.getComputedStyle(canvas).color || '#111827'
  }

  private configureStroke(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    const color = this.canvasColor(canvas)
    ctx.lineWidth = strokeWidth
    ctx.lineCap = ctx.lineJoin = 'round'
    ctx.strokeStyle = ctx.fillStyle = color
  }

  private redraw(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    const { width, height } = this.size
    if (!ctx || !width || !height) return
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    if (this.baseImage) ctx.drawImage(this.baseImage, 0, 0, width, height)
    this.configureStroke(ctx, canvas)
    for (const stroke of this.strokes) paintStroke(ctx, stroke, width, height)
    if (this.active) paintStroke(ctx, this.active.stroke, width, height)
  }
}
