import { Component, OnInit, signal, inject, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { RrhhService } from "../../../shared/services/rrhh.service";
import { HistorialService } from "../../../shared/services/historial.service";
import { ConfirmService } from "../../../shared/services/confirm.service";
import { SupabaseService } from "../../../shared/services/supabase.service";
import { ToastService } from "../../../shared/services/toast.service";
// 1. Importa tu nuevo servicio
import { ExportService } from "../../../shared/services/export.service";
import { Area } from "../../../shared/models/rrhh.model";

@Component({
  selector: "app-empleados",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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
  // 2. Inyecta el servicio
  private exportSvc = inject(ExportService);

  empleados = signal<any[]>([]);
  areas = signal<Area[]>([]);
  isLoading = signal(false);

  empleadoForm = this.fb.group({
    nombre_completo: ["", [Validators.required]],
    area_id: ["", [Validators.required]],
    cargo: ["", [Validators.required]],
  });

  // --- LÓGICA DE PAGINACIÓN ---
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(5);

  paginatedEmpleados = computed(() => {
    const page = this.currentPage();
    const per = this.itemsPerPage();
    const start = (page - 1) * per;
    return this.empleados().slice(start, start + per);
  });

  totalPages = computed(() =>
    Math.ceil(this.empleados().length / this.itemsPerPage()),
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
    await this.loadData();
    try {
      const u = await this.supabase.getUser();
    } catch (err) {
      console.warn("No se pudo obtener usuario para auditoría", err);
    }
  }

  private async loadData() {
    this.isLoading.set(true);
    try {
      const [areasList, empleadosList] = await Promise.all([
        this.rrhh.getAreas(),
        this.rrhh.getEmpleados(),
      ]);
      this.areas.set(areasList);
      this.empleados.set(empleadosList);
    } catch (err) {
      console.error("Error loading RRHH data", err);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Creamos esta función "limpiadora"
  private getDatosLimpios() {
    // Tomamos la lista de empleados y la transformamos
    return this.empleados().map((emp) => ({
      "Nombre Completo": emp.nombre_completo,
      Área: emp.areas?.nombre || "Sin Área",
      Cargo: emp.cargo,
      Estado: emp.estado ? "Activo" : "Inactivo",
      "Fecha Registro": new Date(emp.fecha_creacion).toLocaleDateString(),
    }));
  }

  // 3. --- MÉTODOS DE EXPORTACIÓN ---
  exportarExcel() {
    const dataLimpia = this.getDatosLimpios();
    this.exportSvc.exportToExcel(dataLimpia, "Reporte_Empleados");
    this.toast.success("Excel generado correctamente");
  }

  exportarPdf() {
    const dataLimpia = this.getDatosLimpios();
    // jsPDF AutoTable ajustará automáticamente los anchos de columna al ver que ya no hay IDs gigantes
    this.exportSvc.exportToPdf(
      dataLimpia,
      "Reporte_Empleados",
      "Listado Oficial de Empleados",
    );
    this.toast.success("PDF generado correctamente");
  }
  // ---------------------------------

  async onSubmit() {
    if (this.empleadoForm.invalid) return;
    this.isLoading.set(true);
    try {
      const payload = this.empleadoForm.value as {
        nombre_completo: string;
        area_id: string;
        cargo: string;
      };
      const created = await this.rrhh.createEmpleado(payload);
      this.empleados.update((e) => [...e, created]);
      this.empleadoForm.reset();
      this.toast.success("Empleado creado correctamente");

      this.currentPage.set(this.totalPages());
    } catch (err) {
      console.error("Error creating empleado", err);
      this.toast.error("Error al crear empleado");
    } finally {
      this.isLoading.set(false);
    }
  }

  async onDelete(emp: any) {
    const ok = await this.confirm.confirm(
      `¿Eliminar empleado ${emp.nombre_completo}?`,
    );
    if (!ok) return;
    this.isLoading.set(true);
    try {
      await this.rrhh.deleteEmpleado(emp.id);
      this.empleados.update((list) => list.filter((e) => e.id !== emp.id));

      try {
        const u = await this.supabase.getUser();
        await this.historial.registrar(
          "rrhh",
          emp.id,
          "eliminacion",
          `Empleado ${emp.nombre_completo} eliminado`,
          u?.id ?? undefined,
        );
      } catch (histErr) {
        console.error(
          "Error registrando historial al eliminar empleado",
          histErr,
        );
      }
      this.toast.success("Empleado eliminado");

      if (this.paginatedEmpleados().length === 0 && this.currentPage() > 1) {
        this.currentPage.update((p) => p - 1);
      }
    } catch (err) {
      console.error("Error eliminando empleado", err);
      this.toast.error("Error al eliminar empleado");
    } finally {
      this.isLoading.set(false);
    }
  }
}
