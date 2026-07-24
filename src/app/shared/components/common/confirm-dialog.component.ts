import { Component, OnDestroy, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subscription } from "rxjs";
import { ConfirmService } from "../../services/confirm.service";
import { SupabaseService } from "../../services/supabase.service";

@Component({
  selector: "app-confirm-dialog",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="visible()" class="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="w-[28rem] max-w-[calc(100vw-2rem)] rounded-xl border border-transparent bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 text-xl font-bold text-gray-900 dark:text-white">{{ title() }}</div>
        <div class="mb-6 text-sm text-gray-600 dark:text-gray-300">{{ message() }}</div>

        <div *ngIf="requirePassword()" class="mb-5 rounded-xl border border-error-100 bg-error-50 p-3 dark:border-error-500/20 dark:bg-error-500/10">
          <label class="mb-1 block text-sm font-semibold text-error-700 dark:text-error-300">
            Ingresa tu contraseña para autorizar
          </label>
          <input
            [(ngModel)]="password"
            [disabled]="isValidating()"
            type="password"
            autocomplete="current-password"
            placeholder="Contraseña de tu usuario"
            class="h-10 w-full rounded-lg border border-error-200 bg-white px-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-error-500 dark:border-error-500/30 dark:bg-gray-800 dark:text-white"
            (keydown.enter)="ok()"
          />
          <p *ngIf="errorMessage()" class="mt-2 text-xs font-medium text-error-600 dark:text-error-400">{{ errorMessage() }}</p>
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">Se valida contra Supabase Auth. No se guarda la contraseña en el navegador.</p>
        </div>

        <div class="flex justify-end gap-3">
          <button
            (click)="cancel()"
            [disabled]="isValidating()"
            class="h-10 rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
            Cancelar
          </button>
          <button
            (click)="ok()"
            [disabled]="isValidating() || (requirePassword() && !password.trim())"
            [class.bg-error-600]="danger()"
            [class.hover:bg-error-700]="danger()"
            [class.bg-brand-600]="!danger()"
            [class.hover:bg-brand-700]="!danger()"
            class="h-10 rounded-lg px-4 text-sm font-medium text-white transition disabled:opacity-50">
            {{ isValidating() ? "Validando..." : confirmLabel() }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent implements OnDestroy {
  visible = signal(false);
  message = signal("");
  title = signal("Confirmar accion");
  confirmLabel = signal("Confirmar");
  danger = signal(false);
  requirePassword = signal(false);
  isValidating = signal(false);
  errorMessage = signal("");
  password = "";

  private sub: Subscription | null = null;
  private currentResolve: ((v: boolean) => void) | null = null;

  constructor(
    private confirm: ConfirmService,
    private supabase: SupabaseService,
  ) {
    this.sub = this.confirm.request$.subscribe((req) => {
      if (!req) {
        this.resetState();
        return;
      }

      this.message.set(req.message);
      this.title.set(req.title || "Confirmar accion");
      this.confirmLabel.set(req.confirmLabel || "Confirmar");
      this.danger.set(!!req.danger);
      this.requirePassword.set(!!req.requirePassword);
      this.errorMessage.set("");
      this.password = "";
      this.visible.set(true);
      this.currentResolve = req.resolve;
    });
  }

  async ok() {
    if (this.requirePassword()) {
      this.errorMessage.set("");
      this.isValidating.set(true);

      try {
        const valid = await this.supabase.verifyCurrentUserPassword(this.password);
        if (!valid) {
          this.errorMessage.set("Contraseña incorrecta. No se ejecuto la accion.");
          return;
        }
      } catch (err) {
        this.errorMessage.set("No se pudo validar la contraseña. Intenta nuevamente.");
        return;
      } finally {
        this.isValidating.set(false);
      }
    }

    if (this.currentResolve) this.currentResolve(true);
    this.close();
  }

  cancel() {
    if (this.currentResolve) this.currentResolve(false);
    this.close();
  }

  private close() {
    this.confirm.clear();
    this.resetState();
  }

  private resetState() {
    this.visible.set(false);
    this.message.set("");
    this.title.set("Confirmar accion");
    this.confirmLabel.set("Confirmar");
    this.danger.set(false);
    this.requirePassword.set(false);
    this.isValidating.set(false);
    this.errorMessage.set("");
    this.password = "";
    this.currentResolve = null;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
