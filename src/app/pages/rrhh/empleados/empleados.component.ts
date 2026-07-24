import { Component, OnInit, signal, inject, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { RrhhService } from "../../../shared/services/rrhh.service";
import { HistorialService } from "../../../shared/services/historial.service";
import { ConfirmService } from "../../../shared/services/confirm.service";
import { SupabaseService } from "../../../shared/services/supabase.service";
import { ToastService } from "../../../shared/services/toast.service";
import { ExportService } from "../../../shared/services/export.service";
import { Area } from "../../../shared/models/rrhh.model";
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from "../../../shared/components/form/searchable-select/searchable-select.component";

@Component({
  selector: "app-empleados",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchableSelectComponent],
  templateUrl: "./empleados.component.html",
  styles: [``],
})
export class EmpleadosComponent implements OnInit {
  private rrhh = inject(RrhhService);
  private historial = inject(HistorialService);
  private confirm = inject(ConfirmService);
  private supabase = inject(SupabaseService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private exportSvc = inject(ExportService);

  empleados = signal<any[]>([]);
  areas = signal<Area[]>([]);
  isLoading = signal(false);
  empleadoEnEdicion = signal<any | null>(null);

  searchTerm = signal("");
  areaFilter = signal("TODOS");
  estadoFilter = signal("TODOS");
  currentPage = signal(1);
  itemsPerPage = signal(10);

  empleadoForm = this.fb.group({
    nombre_completo: ["", [Validators.required]],
    area_id: ["", [Validators.required]],
    cargo: ["", [Validators.required]],
  });

  areaOptions = computed<SearchableSelectOption[]>(() =>
    this.areas().map((area) => ({ value: area.id, label: area.nombre })),
  );

  filteredEmpleados = computed(() => {
    const term = this.normalize(this.searchTerm());
    const area = this.areaFilter();
    const estado = this.estadoFilter();

    return this.empleados().filter((emp) => {
      const searchable = this.normalize(
        `${emp.nombre_completo || ""} ${emp.cargo || ""} ${emp.areas?.nombre || ""}`,
      );
      const matchesTerm = !term || searchable.includes(term);
      const matchesArea = area === "TODOS" || emp.area_id === area;
      const matchesEstado =
        estado === "TODOS" ||
        (estado === "ACTIVO" && emp.estado) ||
        (estado === "INACTIVO" && !emp.estado);
      return matchesTerm && matchesArea && matchesEstado;
    });
  });

  paginatedEmpleados = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return this.filteredEmpleados().slice(start, start + this.itemsPerPage());
  });

  totalPages = computed(
    () => Math.ceil(this.filteredEmpleados().length / this.itemsPerPage()) || 1,
  );

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async onSubmit() {
    if (this.empleadoForm.invalid) {
      this.empleadoForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    try {
      const payload = this.empleadoForm.value as any;
      const editando = this.empleadoEnEdicion();

      if (editando) {
        const actualizado = await this.rrhh.updateEmpleado(editando.id, payload);
        this.empleados.update((list) =>
          this.sortEmpleados(list.map((e) => (e.id === editando.id ? actualizado : e))),
        );
        this.toast.success("Empleado actualizado correctamente");
      } else {
        const created = await this.rrhh.createEmpleado(payload);
        this.empleados.update((list) => this.sortEmpleados([created, ...list]));
        this.currentPage.set(1);
        this.toast.success("Empleado creado correctamente");
      }

      this.cancelarEdicion();
    } catch (err) {
      console.error("Error al guardar empleado", err);
      this.toast.error("Error al guardar empleado");
    } finally {
      this.isLoading.set(false);
    }
  }

  editar(emp: any) {
    this.empleadoEnEdicion.set(emp);
    this.empleadoForm.patchValue({
      nombre_completo: emp.nombre_completo,
      area_id: emp.area_id,
      cargo: emp.cargo,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  cancelarEdicion() {
    this.empleadoEnEdicion.set(null);
    this.empleadoForm.reset({ area_id: "" });
  }

  async toggleEstado(emp: any) {
    const accionText = emp.estado ? "dar de baja" : "reactivar";
    if (emp.estado) {
      try {
        const bloqueos = await this.rrhh.getBloqueosParaInactivarEmpleado(emp.id);
        if (bloqueos.length) {
          await this.confirm.confirm(
            `No se puede dar de baja a ${emp.nombre_completo} todavía.\n\nPendientes:\n- ${bloqueos.join("\n- ")}\n\nFlujo correcto: devolución de equipos -> bloqueo AD/correo -> cierre de credenciales -> retiro de equipos -> baja RRHH.`,
          );
          return;
        }
      } catch (err) {
        console.error("Error validando dependencias del empleado", err);
        this.toast.error("No se pudo validar dependencias. No se hizo la baja.");
        return;
      }
    }

    const ok = await this.confirm.confirmCritical(
      `Confirmas ${accionText} a ${emp.nombre_completo}? Este cambio afecta RRHH, asignaciones y reportes.`,
      emp.estado ? "Dar de baja empleado" : "Reactivar empleado",
      emp.estado ? "Dar de baja" : "Reactivar",
    );
    if (!ok) return;

    this.isLoading.set(true);
    try {
      const nuevoEstado = !emp.estado;
      const actualizado = await this.rrhh.updateEmpleado(emp.id, {
        estado: nuevoEstado,
      });
      this.empleados.update((list) =>
        this.sortEmpleados(list.map((e) => (e.id === emp.id ? actualizado : e))),
      );
      this.toast.success(`Empleado ${nuevoEstado ? "activado" : "inactivado"}`);

      try {
        const u = await this.supabase.getUser();
        await this.historial.registrar(
          "rrhh",
          emp.id,
          nuevoEstado ? "ALTA" : "BAJA",
          `Se cambio el estado a ${nuevoEstado ? "Activo" : "Inactivo"}`,
          u?.id,
        );
      } catch (e) {}
    } catch (err) {
      this.toast.error("Error al cambiar estado");
    } finally {
      this.isLoading.set(false);
    }
  }

  exportarExcel() {
    this.exportSvc.exportToExcel(this.getDatosLimpios(), "Reporte_Empleados");
    this.toast.success("Excel generado correctamente");
  }

  exportarPdf() {
    this.exportSvc.exportToPdf(
      this.getDatosLimpios(),
      "Reporte_Empleados",
      "Listado Oficial de Empleados",
    );
    this.toast.success("PDF generado correctamente");
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) this.currentPage.update((p) => p + 1);
  }

  prevPage() {
    if (this.currentPage() > 1) this.currentPage.update((p) => p - 1);
  }

  onSearch(value: string) {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  onAreaFilter(value: string) {
    this.areaFilter.set(value);
    this.currentPage.set(1);
  }

  onEstadoFilter(value: string) {
    this.estadoFilter.set(value);
    this.currentPage.set(1);
  }

  onItemsPerPage(value: string) {
    this.itemsPerPage.set(Number(value));
    this.currentPage.set(1);
  }

  resetFilters() {
    this.searchTerm.set("");
    this.areaFilter.set("TODOS");
    this.estadoFilter.set("TODOS");
    this.currentPage.set(1);
  }

  private async loadData() {
    this.isLoading.set(true);
    try {
      const [areasList, empleadosList] = await Promise.all([
        this.rrhh.getAreas(),
        this.rrhh.getEmpleados(),
      ]);
      this.areas.set([...areasList].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      this.empleados.set(this.sortEmpleados(empleadosList));
    } catch (err) {
      this.toast.error("Error cargando datos");
    } finally {
      this.isLoading.set(false);
    }
  }

  private getDatosLimpios() {
    return this.filteredEmpleados().map((emp) => ({
      "Nombre Completo": emp.nombre_completo,
      Area: emp.areas?.nombre || "Sin area",
      Cargo: emp.cargo,
      Estado: emp.estado ? "Activo" : "Inactivo",
      "Fecha Registro": new Date(emp.fecha_creacion).toLocaleDateString("es-PE"),
    }));
  }

  private sortEmpleados(items: any[]) {
    return [...items].sort((a, b) =>
      (a.nombre_completo || "").localeCompare(b.nombre_completo || "", "es", {
        sensitivity: "base",
      }),
    );
  }

  private normalize(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }
}
