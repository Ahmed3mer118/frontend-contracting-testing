import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FormDraftService {
  save<T>(key: string, data: T): void {
    try {
      localStorage.setItem(`construction_draft_${key}`, JSON.stringify(data));
    } catch {
      /* ignore quota errors */
    }
  }

  load<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(`construction_draft_${key}`);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  clear(key: string): void {
    localStorage.removeItem(`construction_draft_${key}`);
  }
}
