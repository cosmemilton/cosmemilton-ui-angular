import { ChangeDetectionStrategy, Component, inject, Injectable, signal } from '@angular/core'
import { CmIcon } from './icon'

type ToastTone = 'default' | 'success' | 'warning' | 'danger' | 'info'
type Toast = { id: number; title?: string; message: string; tone: ToastTone }

@Injectable({ providedIn: 'root' })
export class CmToastService {
  private nextId = 0
  private readonly state = signal<Toast[]>([])
  readonly items = this.state.asReadonly()

  show(message: string, options: { title?: string; tone?: ToastTone; duration?: number } = {}) {
    const id = ++this.nextId
    this.state.update(items => [...items.slice(-2), { id, message, title: options.title, tone: options.tone ?? 'default' }])
    setTimeout(() => this.dismiss(id), options.duration ?? 4800)
  }

  dismiss(id: number) {
    this.state.update(items => items.filter(item => item.id !== id))
  }
}

@Component({
  selector: 'cm-toast-viewport',
  imports: [CmIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cm-toast__viewport cm-toast__viewport--top-right" aria-live="polite">
      @for (item of toast.items(); track item.id) {
        <div [class]="'cm-toast__item cm-toast__item--visible cm-toast__item--' + item.tone"
          [attr.role]="item.tone === 'danger' ? 'alert' : 'status'">
          <div class="cm-toast__icon"><cm-icon [name]="item.tone === 'success' ? 'circle-check' : 'circle-alert'" /></div>
          <div class="cm-toast__content">
            @if (item.title) { <strong class="cm-toast__title">{{ item.title }}</strong> }
            <span class="cm-toast__message">{{ item.message }}</span>
          </div>
          <button class="cm-toast__close" type="button" aria-label="Fechar notificação" (click)="toast.dismiss(item.id)">
            <cm-icon name="x" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
})
export class CmToastViewport {
  protected readonly toast = inject(CmToastService)
}
