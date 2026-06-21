import { Injectable, signal } from '@angular/core';
import arTranslations from '../../../assets/i18n/ar.json';
import enTranslations from '../../../assets/i18n/en.json';

export type Lang = 'ar' | 'en';

const BUNDLED: Record<Lang, Record<string, unknown>> = {
  ar: arTranslations as Record<string, unknown>,
  en: enTranslations as Record<string, unknown>,
};

@Injectable({ providedIn: 'root' })
export class TranslateService {
  private translations: Record<string, unknown> = BUNDLED.ar;
  readonly currentLang = signal<Lang>('ar');
  readonly isRtl = signal(true);
  /** Bumped when translations change so pipes re-render. */
  readonly version = signal(0);

  async use(lang: Lang): Promise<void> {
    this.translations = BUNDLED[lang] ?? BUNDLED.ar;
    this.currentLang.set(lang);
    this.isRtl.set(lang === 'ar');
    this.version.update((v) => v + 1);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }

  instant(key: string): string {
    const parts = key.split('.');
    let value: unknown = this.translations;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in (value as object)) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return key;
      }
    }
    return typeof value === 'string' ? value : key;
  }

  t(key: string): string {
    return this.instant(key);
  }
}
