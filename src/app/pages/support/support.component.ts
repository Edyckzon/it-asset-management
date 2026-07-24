import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { SupportService } from "../../shared/services/support.service";
import { ToastService } from "../../shared/services/toast.service";

@Component({
  selector: "app-support",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./support.component.html",
})
export class SupportComponent implements OnInit {
  private fb = inject(FormBuilder);
  private support = inject(SupportService);
  private toast = inject(ToastService);

  isLoading = signal(false);
  tickets = signal<any[]>([]);

  ticketForm = this.fb.group({
    modulo: ["Inventario TI", [Validators.required]],
    categoria: ["Incidencia", [Validators.required]],
    prioridad: ["Media", [Validators.required]],
    asunto: ["", [Validators.required, Validators.minLength(4)]],
    detalle: ["", [Validators.required, Validators.minLength(10)]],
  });

  async ngOnInit(): Promise<void> {
    await this.loadTickets();
  }

  async submit() {
    if (this.ticketForm.invalid) {
      this.ticketForm.markAllAsTouched();
      this.toast.error("Completa asunto y detalle del ticket");
      return;
    }

    this.isLoading.set(true);
    try {
      await this.support.createTicket(this.ticketForm.value as any);
      this.toast.success("Ticket registrado correctamente");
      this.ticketForm.reset({
        modulo: "Inventario TI",
        categoria: "Incidencia",
        prioridad: "Media",
      });
      await this.loadTickets();
    } catch (err) {
      console.error("Error registrando ticket", err);
      this.toast.error("No se pudo guardar. Ejecuta primero el SQL de soporte_tickets.");
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadTickets() {
    try {
      this.tickets.set(await this.support.getMyTickets());
    } catch {
      this.tickets.set([]);
    }
  }
}
