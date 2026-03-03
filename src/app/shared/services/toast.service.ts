import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type ToastType = 'success' | 'error';

export interface ToastMessage {
  id: number;
  type: ToastType;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private subject = new Subject<ToastMessage>();
  private counter = 1;

  get messages$() {
    return this.subject.asObservable();
  }

  success(text: string) {
    this.emit('success', text);
  }

  error(text: string) {
    this.emit('error', text);
  }

  private emit(type: ToastType, text: string) {
    const msg: ToastMessage = { id: this.counter++, type, text };
    this.subject.next(msg);
  }
}
