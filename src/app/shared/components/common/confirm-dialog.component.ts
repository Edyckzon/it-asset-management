import { Component, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmService } from '../../services/confirm.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="visible()" class="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="bg-white dark:bg-gray-900 border border-transparent dark:border-gray-800 rounded-xl p-6 w-[26rem] shadow-xl">
        <div class="text-xl font-bold mb-3 text-gray-900 dark:text-white">Confirmar Acción</div>
        <div class="mb-6 text-sm text-gray-600 dark:text-gray-300">{{ message() }}</div>
        
        <div class="flex justify-end gap-3">
          <button (click)="cancel()" class="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition">
            Cancelar
          </button>
          <button (click)="ok()" class="px-4 py-2 text-sm font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition">
            Confirmar
          </button>
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