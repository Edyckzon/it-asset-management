import { Component, OnInit, signal, inject, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HistorialService } from "../../../shared/services/historial.service";

@Component({
  selector: "app-historial",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./historial.component.html", // <-- Apuntando al HTML externo
  styles: [``],
})
export class HistorialComponent implements OnInit {
  private historialSvc = inject(HistorialService);

  historial = signal<any[]>([]);
  isLoading = signal(false);

  // --- LÓGICA DE PAGINACIÓN ---
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(10); // Historial muestra 10 registros por página

  paginatedHistorial = computed(() => {
    const page = this.currentPage();
    const per = this.itemsPerPage();
    const start = (page - 1) * per;
    return this.historial().slice(start, start + per);
  });

  totalPages = computed(() =>
    Math.ceil(this.historial().length / this.itemsPerPage()),
  );

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
    }
  }
  // -----------------------------

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
