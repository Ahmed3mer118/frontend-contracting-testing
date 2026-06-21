import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="form-field">
      @if (label) {
        <label class="form-label" [for]="inputId">{{ label }}</label>
      }
      @if (type === 'select') {
        <select class="input" [id]="inputId" [ngModel]="model" (ngModelChange)="modelChange.emit($event)" [name]="name" [required]="required">
          <ng-content />
        </select>
      } @else if (type === 'textarea') {
        <textarea class="input" [id]="inputId" [ngModel]="model" (ngModelChange)="modelChange.emit($event)" [name]="name" [rows]="rows" [required]="required"></textarea>
      } @else {
        <input
          class="input"
          [id]="inputId"
          [type]="type"
          [ngModel]="model"
          (ngModelChange)="modelChange.emit($event)"
          [name]="name"
          [step]="step"
          [required]="required"
          [placeholder]="placeholder"
        />
      }
    </div>
  `,
})
export class FormFieldComponent {
  @Input() label = '';
  @Input() type = 'text';
  @Input() name = '';
  @Input() model: unknown;
  @Input() placeholder = '';
  @Input() required = false;
  @Input() step?: string;
  @Input() rows = 3;
  @Input() inputId = `field-${Math.random().toString(36).slice(2, 9)}`;
  @Output() modelChange = new EventEmitter<unknown>();
}
