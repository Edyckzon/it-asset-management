import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ConfirmRequest {
  message: string;
  title?: string;
  confirmLabel?: string;
  danger?: boolean;
  requirePassword?: boolean;
  resolve: (value: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private requestSubject = new BehaviorSubject<ConfirmRequest | null>(null);
  readonly request$: Observable<ConfirmRequest | null> = this.requestSubject.asObservable();

  async confirm(message: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.requestSubject.next({ message, resolve });
    });
  }

  async confirmCritical(
    message: string,
    title = "Accion critica",
    confirmLabel = "Confirmar accion",
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.requestSubject.next({
        message,
        title,
        confirmLabel,
        danger: true,
        requirePassword: true,
        resolve,
      });
    });
  }

  clear() {
    this.requestSubject.next(null);
  }
}
