import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  template: `
    @if (open) {
      <div class="modal-backdrop" (click)="onBackdrop()">
        <div class="modal-panel" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">{{ title }}</h3>
            <button type="button" class="modal-close" (click)="close.emit()">&times;</button>
          </div>
          <div class="modal-body">
            <ng-content />
          </div>
          @if (showFooter) {
            <div class="modal-footer">
              <ng-content select="[modal-footer]" />
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class ModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() showFooter = true;
  @Input() closeOnBackdrop = true;
  @Output() close = new EventEmitter<void>();

  onBackdrop(): void {
    if (this.closeOnBackdrop) this.close.emit();
  }
}
