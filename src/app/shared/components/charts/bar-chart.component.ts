import { Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

export interface ChartItem {
  label: string;
  value: number;
}

/** Power BI default categorical palette */
const PBI_COLORS = [
  '#118DFF', '#12239E', '#E66C37', '#6B007B',
  '#E044A7', '#744EC2', '#D9B300', '#D64550',
];

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="pbi-visual">
      @if (items.length) {
        @if (layout === 'donut') {
          <div class="pbi-donut-wrap">
            <svg [attr.viewBox]="'0 0 ' + size + ' ' + size" class="pbi-svg">
              @for (seg of donutSegments; track seg.label) {
                <path [attr.d]="seg.path" [attr.fill]="seg.color" class="pbi-donut-segment" />
              }
              <circle [attr.cx]="size/2" [attr.cy]="size/2" [attr.r]="donutInner" fill="#fff" />
              <text [attr.x]="size/2" [attr.y]="size/2 - 6" text-anchor="middle" class="pbi-donut-total">{{ totalValue | number:'1.0-0' }}</text>
              <text [attr.x]="size/2" [attr.y]="size/2 + 14" text-anchor="middle" class="pbi-donut-sub">EGP</text>
            </svg>
          </div>
        } @else if (layout === 'bar') {
          <!-- Horizontal bar chart (Power BI bar chart) -->
          <svg [attr.viewBox]="'0 0 ' + svgWidth + ' ' + hBarHeight" class="pbi-svg" preserveAspectRatio="xMidYMid meet">
            @for (tick of xTicks; track tick) {
              <line [attr.x1]="hBarX(tick)" [attr.y1]="padT" [attr.x2]="hBarX(tick)" [attr.y2]="hBarHeight - padB" class="pbi-grid" />
              <text [attr.x]="hBarX(tick)" [attr.y]="hBarHeight - 6" text-anchor="middle" class="pbi-axis">{{ tick | number:'1.0-0' }}</text>
            }
            @for (item of items; track item.label; let i = $index) {
              <text [attr.x]="padL - 8" [attr.y]="hBarRowY(i) + hBarRowH / 2 + 4" text-anchor="end" class="pbi-category">{{ truncate(item.label, 14) }}</text>
              <rect
                [attr.x]="padL"
                [attr.y]="hBarRowY(i)"
                [attr.width]="hBarW(item.value)"
                [attr.height]="hBarRowH - 6"
                [attr.fill]="color(i)"
                rx="2"
                class="pbi-bar"
              />
              <text [attr.x]="padL + hBarW(item.value) + 6" [attr.y]="hBarRowY(i) + hBarRowH / 2 + 4" class="pbi-data-label">{{ item.value | number:'1.0-0' }}</text>
            }
          </svg>
        } @else {
          <!-- Clustered column chart -->
          <svg [attr.viewBox]="'0 0 ' + svgWidth + ' ' + svgHeight" class="pbi-svg" preserveAspectRatio="xMidYMid meet">
            @for (tick of yTicks; track tick) {
              <line [attr.x1]="padL" [attr.y1]="tickY(tick)" [attr.x2]="svgWidth - padR" [attr.y2]="tickY(tick)" class="pbi-grid" />
              <text [attr.x]="padL - 8" [attr.y]="tickY(tick) + 4" text-anchor="end" class="pbi-axis">{{ tick | number:'1.0-0' }}</text>
            }
            <line [attr.x1]="padL" [attr.y1]="chartBottom" [attr.x2]="svgWidth - padR" [attr.y2]="chartBottom" class="pbi-axis-line" />
            @for (item of items; track item.label; let i = $index) {
              <rect
                [attr.x]="colX(i)"
                [attr.y]="colY(item.value)"
                [attr.width]="colW"
                [attr.height]="colH(item.value)"
                [attr.fill]="color(i)"
                rx="2"
                class="pbi-bar"
              />
              <text [attr.x]="colX(i) + colW / 2" [attr.y]="colY(item.value) - 6" text-anchor="middle" class="pbi-data-label">{{ item.value | number:'1.0-0' }}</text>
              <text [attr.x]="colX(i) + colW / 2" [attr.y]="svgHeight - 8" text-anchor="middle" class="pbi-category">{{ truncate(item.label, 10) }}</text>
            }
          </svg>
        }

        <div class="pbi-legend">
          @for (item of items; track item.label; let i = $index) {
            <div class="pbi-legend-item">
              <span class="pbi-legend-dot" [style.background]="color(i)"></span>
              <span class="pbi-legend-text">{{ item.label }}</span>
              <span class="pbi-legend-value">{{ item.value | number:'1.0-0' }}</span>
            </div>
          }
        </div>
      } @else {
        <div class="pbi-empty">—</div>
      }
    </div>
  `,
})
export class BarChartComponent {
  @Input() items: ChartItem[] = [];
  @Input() layout: 'column' | 'bar' | 'donut' = 'column';

  readonly svgWidth = 420;
  readonly svgHeight = 260;
  readonly padL = 52;
  readonly padR = 16;
  readonly padT = 24;
  readonly padB = 28;
  readonly size = 200;
  readonly donutInner = 58;

  chartBottom = this.svgHeight - 36;
  chartAreaH = this.chartBottom - this.padT;
  chartAreaW = this.svgWidth - this.padL - this.padR;

  get hBarHeight(): number {
    return Math.max(this.padT + this.padB + this.items.length * 36, 180);
  }

  get hBarRowH(): number {
    return (this.hBarHeight - this.padT - this.padB) / Math.max(this.items.length, 1);
  }

  get colW(): number {
    const n = Math.max(this.items.length, 1);
    const slot = this.chartAreaW / n;
    return Math.min(Math.max(slot * 0.55, 24), 56);
  }

  get maxVal(): number {
    const m = Math.max(...this.items.map((i) => Math.abs(i.value)), 0);
    return this.niceMax(m || 1);
  }

  get yTicks(): number[] {
    const max = this.maxVal;
    return [0, 0.25, 0.5, 0.75, 1].map((p) => Math.round(max * p));
  }

  get xTicks(): number[] {
    return this.yTicks;
  }

  get totalValue(): number {
    return this.items.reduce((s, i) => s + Math.abs(i.value), 0);
  }

  get donutSegments(): Array<{ label: string; color: string; path: string }> {
    const total = this.totalValue || 1;
    const cx = this.size / 2;
    const cy = this.size / 2;
    const outer = 88;
    const inner = this.donutInner;
    let angle = -Math.PI / 2;
    return this.items.map((item, i) => {
      const sweep = (Math.abs(item.value) / total) * Math.PI * 2;
      const start = angle;
      const end = angle + sweep;
      angle = end;
      return { label: item.label, color: this.color(i), path: this.donutArc(cx, cy, outer, inner, start, end) };
    });
  }

  color(index: number): string {
    return PBI_COLORS[index % PBI_COLORS.length];
  }

  colX(index: number): number {
    const n = this.items.length;
    const slot = this.chartAreaW / n;
    return this.padL + slot * index + (slot - this.colW) / 2;
  }

  colY(value: number): number {
    return this.chartBottom - (Math.abs(value) / this.maxVal) * this.chartAreaH;
  }

  colH(value: number): number {
    const h = (Math.abs(value) / this.maxVal) * this.chartAreaH;
    return Math.max(h, value ? 2 : 0);
  }

  tickY(tick: number): number {
    return this.chartBottom - (tick / this.maxVal) * this.chartAreaH;
  }

  hBarX(tick: number): number {
    return this.padL + (tick / this.maxVal) * this.chartAreaW;
  }

  hBarRowY(index: number): number {
    return this.padT + index * this.hBarRowH + 3;
  }

  hBarW(value: number): number {
    return Math.max((Math.abs(value) / this.maxVal) * this.chartAreaW, value ? 2 : 0);
  }

  truncate(text: string, max: number): string {
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  }

  private niceMax(value: number): number {
    const exp = Math.pow(10, Math.floor(Math.log10(value)));
    const f = value / exp;
    const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return nice * exp;
  }

  private donutArc(cx: number, cy: number, r: number, ir: number, a0: number, a1: number): string {
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const xi0 = cx + ir * Math.cos(a0);
    const yi0 = cy + ir * Math.sin(a0);
    const xi1 = cx + ir * Math.cos(a1);
    const yi1 = cy + ir * Math.sin(a1);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${ir} ${ir} 0 ${large} 0 ${xi0} ${yi0} Z`;
  }
}
