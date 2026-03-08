import { Component, OnInit, signal, inject, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RrhhService } from "../../../shared/services/rrhh.service";
import { ToastService } from "../../../shared/services/toast.service";
import { Area } from "../../../shared/models/rrhh.model";

@Component({
  selector: "app-areas",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./areas.component.html",
  styles: [``],
})
export class AreasComponent implements OnInit {
  private rrhh = inject(RrhhService);
  private toast = inject(ToastService);

  areas = signal<Area[]>([]);
  isLoading = signal(false);

  // --- LÓGICA DE PAGINACIÓN ---
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(5); // Muestra 5 áreas por página

  paginatedAreas = computed(() => {
    const page = this.currentPage();
    const per = this.itemsPerPage();
    const start = (page - 1) * per;
    return this.areas().slice(start, start + per);
  });

  totalPages = computed(() =>
    Math.ceil(this.areas().length / this.itemsPerPage()),
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
    await this.loadAreas();
  }

  async loadAreas() {
    this.isLoading.set(true);
    try {
      const list = await this.rrhh.getAreas();
      this.areas.set(list);
    } catch (err) {
      console.error("Error loading areas", err);
      this.toast.error("No se pudieron cargar las áreas");
    } finally {
      this.isLoading.set(false);
    }
  }

  async addArea(nombre: string) {
    const name = (nombre || "").trim();
    if (!name) {
      this.toast.error("El nombre del área no puede estar vacío");
      return;
    }

    this.isLoading.set(true);
    try {
      const created = await this.rrhh.createArea(name);
      this.areas.update((arr) => [...arr, created]);

      this.toast.success(`Área "${name}" creada correctamente`);

      // Opcional: Si quieres que al crear un área te lleve a la última página para verla
      this.currentPage.set(this.totalPages());
    } catch (err) {
      console.error("Error creating area", err);
      this.toast.error("Hubo un error al crear el área");
    } finally {
      this.isLoading.set(false);
    }
  }
}
