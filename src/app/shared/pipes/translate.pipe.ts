import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '../../core/services/translate.service';

@Pipe({ name: 't', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private translate = inject(TranslateService);

  transform(key: string): string {
    this.translate.version();
    this.translate.currentLang();
    return this.translate.instant(key);
  }
}
