import { Component, OnInit, signal, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HistorialService } from "../../../shared/services/historial.service";

@Component({
  selector: "app-historial",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-4 max-w-5xl mx-auto">
      <h2 class="text-lg font-semibold mb-4">Historial de movimientos</h2>
      <div *ngIf="isLoading()" class="p-4 text-gray-500">Cargando...</div>
      <div *ngIf="!isLoading()" class="overflow-x-auto bg-white rounded shadow">
        <table class="w-full text-left">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-4 py-2">Fecha</th>
              <th class="px-4 py-2">Módulo</th>
              <th class="px-4 py-2">Registro ID</th>
              <th class="px-4 py-2">Acción</th>
              <th class="px-4 py-2">Detalle</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let h of historial()" class="border-t">
              <td class="px-4 py-2 text-sm text-gray-600">
                {{ h.fecha | date : "short" }}
              </td>
              <td class="px-4 py-2 text-sm">{{ h.modulo }}</td>
              <td class="px-4 py-2 text-sm">{{ h.registro_id }}</td>
              <td class="px-4 py-2 text-sm">{{ h.accion }}</td>
              <td class="px-4 py-2 text-sm">{{ h.detalle }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [``],
})
export class HistorialComponent implements OnInit {
  private historialSvc = inject(HistorialService);

  historial = signal<any[]>([]);
  isLoading = signal(false);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load() {
    this.isLoading.set(true);
    try {
      const items = await this.historialSvc.getAll();
      this.historial.set(items);
    } catch (err) {
      console.error("Error cargando historial", err);
    } finally {
      this.isLoading.set(false);
    }
  }
}
