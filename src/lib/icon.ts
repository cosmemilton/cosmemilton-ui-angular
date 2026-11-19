import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'
import { iconNodes } from './icon-nodes'

@Component({
  selector: 'cm-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  styles: [':host { display: inline-flex; align-items: center; flex: none; }'],
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">
      @for (node of nodes(); track $index) {
        @switch (node[0]) {
          @case ('path') { <svg:path [attr.d]="node[1]['d']" /> }
          @case ('circle') { <svg:circle [attr.cx]="node[1]['cx']" [attr.cy]="node[1]['cy']" [attr.r]="node[1]['r']" /> }
          @case ('line') { <svg:line [attr.x1]="node[1]['x1']" [attr.y1]="node[1]['y1']" [attr.x2]="node[1]['x2']" [attr.y2]="node[1]['y2']" /> }
          @case ('polyline') { <svg:polyline [attr.points]="node[1]['points']" /> }
          @case ('polygon') { <svg:polygon [attr.points]="node[1]['points']" /> }
          @case ('rect') { <svg:rect [attr.x]="node[1]['x']" [attr.y]="node[1]['y']" [attr.width]="node[1]['width']" [attr.height]="node[1]['height']" [attr.rx]="node[1]['rx']" /> }
          @case ('ellipse') { <svg:ellipse [attr.cx]="node[1]['cx']" [attr.cy]="node[1]['cy']" [attr.rx]="node[1]['rx']" [attr.ry]="node[1]['ry']" /> }
        }
      }
    </svg>
  `,
})
export class CmIcon {
  readonly name = input.required<string>()
  readonly size = input(18)
  protected readonly nodes = computed(() => iconNodes[this.name()] ?? iconNodes['circle-help'])
}
