import { Component, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmService } from '../../services/confirm.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="visible()" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="bg-white rounded-lg p-4 w-96">
        <div class="text-lg font-semibold mb-2">Confirmar</div>
        <div class="mb-4">{{ message() }}</div>
        <div class="flex justify-end gap-2">
          <button (click)="cancel()" class="px-3 py-1 rounded bg-gray-200">Cancelar</button>
          <button (click)="ok()" class="px-3 py-1 rounded bg-red-600 text-white">Eliminar</button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent implements OnDestroy {
  visible = signal(false);
  message = signal('');

  private sub: Subscription | null = null;
  private currentResolve: ((v: boolean) => void) | null = null;

  constructor(private confirm: ConfirmService) {
    this.sub = this.confirm.request$.subscribe((req) => {
      if (!req) {
        this.visible.set(false);
        this.message.set('');
        this.currentResolve = null;
        return;
      }
      this.message.set(req.message);
      this.visible.set(true);
      this.currentResolve = req.resolve;
    });
  }

  ok() {
    if (this.currentResolve) this.currentResolve(true);
    this.close();
  }

  cancel() {
    if (this.currentResolve) this.currentResolve(false);
    this.close();
  }

  private close() {
    this.visible.set(false);
    this.message.set('');
    this.confirm.clear();
    this.currentResolve = null;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
