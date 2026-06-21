import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `
    @if (show) {
      <div class="loading-overlay">
        <div class="loading-spinner"></div>
        @if (message) {
          <p class="loading-text">{{ message }}</p>
        }
      </div>
    }
  `,
})
export class LoadingSpinnerComponent {
  @Input() show = false;
  @Input() message = '';
}
