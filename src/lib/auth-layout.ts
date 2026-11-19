import { NgTemplateOutlet } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, contentChild, Directive, input } from '@angular/core'
import { CmIcon } from './icon'

let nextTitle = 0

@Directive({ selector: '[cmAuthActions]' })
export class CmAuthActions {}
@Directive({ selector: '[cmAuthFooter]' })
export class CmAuthFooter {}

@Component({
  selector: 'cm-auth-layout',
  imports: [NgTemplateOutlet, CmIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[style.--cm-auth-background-image]': 'backgroundUrl()',
    '[style.--cm-auth-artwork-image]': 'artworkUrl()',
  },
  template: `
    <ng-template #header>
      @if (brand() || actions()) {
        <header class="cm-row cm-layout-wrap cm-auth__header" data-align="center" [attr.data-justify]="brand() ? 'between' : 'end'">
          @if (brand()) {
            <div class="cm-row cm-auth__brand" data-align="center" style="--cm-layout-gap:var(--space-sm)">
              @if (brandIcon()) {
                <span class="cm-row cm-auth__brand-mark" aria-hidden="true"><cm-icon [name]="brandIcon()" [size]="20" /></span>
              }
              <span class="cm-text cm-text--lg cm-text--extrabold cm-text--family-heading cm-text--tracking-tight">{{ brand() }}</span>
            </div>
          }
          <ng-content select="[cmAuthActions]" />
        </header>
      }
    </ng-template>

    <div class="cm-stack cm-auth__workspace">
      @if (layout() === 'centered') { <ng-container [ngTemplateOutlet]="header" /> }
      <main class="cm-stack cm-auth__content" [attr.aria-labelledby]="titleId">
        <div class="cm-stack cm-auth__panel" style="--cm-layout-gap:var(--space-xl)">
          @if (layout() === 'split') { <ng-container [ngTemplateOutlet]="header" /> }
          <div class="cm-stack" style="--cm-layout-gap:var(--space-sm)">
            @if (icon()) {
              <span class="cm-row cm-auth__title-icon" aria-hidden="true"><cm-icon [name]="icon()" [size]="22" /></span>
            }
            @if (eyebrow()) { <span class="cm-text cm-text--xs cm-text--bold cm-auth__eyebrow">{{ eyebrow() }}</span> }
            <h1 class="cm-text cm-text--family-heading cm-text--extrabold cm-auth__title" [id]="titleId">{{ title() }}</h1>
            @if (description()) { <p class="cm-text cm-text--muted cm-text--wrap-pretty">{{ description() }}</p> }
          </div>
          <ng-content />
          @if (footer()) {
            <footer class="cm-stack cm-auth__footer" style="--cm-layout-gap:var(--space-sm)"><ng-content select="[cmAuthFooter]" /></footer>
          }
        </div>
      </main>
    </div>
    @if (layout() === 'split') { <div class="cm-stack cm-auth__illustration" aria-hidden="true"></div> }
  `,
})
export class CmAuthLayout {
  readonly title = input.required<string>()
  readonly description = input('')
  readonly eyebrow = input('')
  readonly icon = input('')
  readonly brand = input('')
  readonly brandIcon = input('')
  readonly layout = input<'centered' | 'split'>('centered')
  readonly appearance = input<'plain' | 'glass'>('plain')
  readonly backgroundImage = input('')
  readonly artworkImage = input('')
  readonly actions = contentChild(CmAuthActions)
  readonly footer = contentChild(CmAuthFooter)
  readonly titleId = 'cm-auth-title-' + (++nextTitle)
  readonly classes = computed(() => [
    'cm-stack cm-auth', 'cm-auth--' + this.layout(), 'cm-auth--' + this.appearance(),
    this.backgroundImage() ? 'cm-auth--with-background' : '',
  ].join(' '))
  readonly backgroundUrl = computed(() => this.backgroundImage() ? 'url(' + JSON.stringify(this.backgroundImage()) + ')' : null)
  readonly artworkUrl = computed(() => this.artworkImage() ? 'url(' + JSON.stringify(this.artworkImage()) + ')' : null)
}
