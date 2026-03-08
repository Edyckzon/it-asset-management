import { Component, inject, signal, OnInit, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { InventarioService } from "../../../shared/services/inventario.service";
import { RrhhService } from "../../../shared/services/rrhh.service";
import { HistorialService } from "../../../shared/services/historial.service";
import { SupabaseService } from "../../../shared/services/supabase.service";
import { ToastService } from "../../../shared/services/toast.service";
import { ExportService } from "../../../shared/services/export.service";
import { ConfirmService } from "../../../shared/services/confirm.service";

@Component({
  selector: "app-asignaciones",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./asignaciones.component.html",
  styles: [``],
})
export class AsignacionesComponent implements OnInit {
  private inv = inject(InventarioService);
  private rrhh = inject(RrhhService);
  private historial = inject(HistorialService);
  private supabase = inject(SupabaseService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private exportSvc = inject(ExportService);
  private confirm = inject(ConfirmService);

  asignaciones = signal<any[]>([]);
  empleados = signal<any[]>([]);
  activosDisponibles = signal<any[]>([]);
  isLoading = signal(false);
  userId = signal<string | null>(null);

  asignacionForm = this.fb.group({
    empleado_id: ["", [Validators.required]],
    activo_id: ["", [Validators.required]],
    notas: [""],
  });

  // --- LÓGICA DE PAGINACIÓN ---
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(5);

  paginatedAsignaciones = computed(() => {
    const page = this.currentPage();
    const per = this.itemsPerPage();
    const start = (page - 1) * per;
    return this.asignaciones().slice(start, start + per);
  });

  totalPages = computed(() => Math.ceil(this.asignaciones().length / this.itemsPerPage()));

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

  // --- MÉTODOS DE EXPORTACIÓN ---
  private getDatosLimpios() {
    return this.asignaciones().map(a => ({
      'Fecha Asignación': new Date(a.fecha_asignacion).toLocaleDateString(),
      'Empleado': a.empleados?.nombre_completo || 'Desconocido',
      'Código Equipo': a.activos_ti?.codigo_inventario || '-',
      'Tipo de Equipo': a.activos_ti?.tipo_activo || '-',
      'Marca/Modelo': a.activos_ti?.marca_modelo || '-',
      'Notas de Entrega': a.notas || 'Sin observaciones'
    }));
  }

  exportarExcel() {
    this.exportSvc.exportToExcel(this.getDatosLimpios(), 'Reporte_Asignaciones_TI');
    this.toast.success('Excel de asignaciones generado');
  }

  exportarPdf() {
    this.exportSvc.exportToPdf(this.getDatosLimpios(), 'Reporte_Asignaciones_TI', 'Acta de Asignaciones de Hardware Activas');
    this.toast.success('PDF de asignaciones generado');
  }
  // ---------------------------------

  async ngOnInit(): Promise<void> {
    await this.loadData();
    try {
      const u = await this.supabase.getUser();
      this.userId.set(u?.id ?? null);
    } catch (err) {
      console.warn("No se pudo obtener usuario para auditoría");
    }
  }

  private async loadData() {
    this.isLoading.set(true);
    try {
      const [asigs, emps, todosLosActivos] = await Promise.all([
        this.inv.getAsignacionesActivas(),
        this.rrhh.getEmpleados(),
        this.inv.getActivos()
      ]);
      
      this.asignaciones.set(asigs);
      this.empleados.set(emps);
      
      // Filtramos para mostrar solo los que están realmente disponibles en almacén
      const disponibles = todosLosActivos.filter(a => a.estado === 'Disponible');
      this.activosDisponibles.set(disponibles);

    } catch (err) {
      console.error("Error al cargar datos", err);
      this.toast.error("Error cargando el módulo de asignaciones");
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSubmit() {
    if (this.asignacionForm.invalid) {
      this.toast.error('Selecciona un empleado y un equipo disponible');
      return;
    }
    
    this.isLoading.set(true);
    try {
      const payload = { ...this.asignacionForm.value } as any;
      
      // Creamos la asignación y actualizamos el activo en un solo viaje
      await this.inv.crearAsignacion(payload);
      
      this.toast.success("Equipo asignado y registrado correctamente");
      this.asignacionForm.reset({ empleado_id: "", activo_id: "" });
      
      // Recargamos todo para actualizar la tabla y quitar el equipo de la lista de disponibles
      await this.loadData();
      this.currentPage.set(1);

      // Auditoría en la Caja Negra
      await this.historial.registrar(
        "asignaciones",
        payload.activo_id,
        "nueva_asignacion",
        `Se entregó el equipo al empleado seleccionado. Notas: ${payload.notas || 'Ninguna'}`,
        this.userId() ?? undefined
      );

    } catch (err) {
      console.error("Error asignando equipo", err);
      this.toast.error("Error al registrar la asignación");
    } finally {
      this.isLoading.set(false);
    }
  }

  async devolverEquipo(asignacion: any) {
    const empleado = asignacion.empleados?.nombre_completo;
    const equipo = asignacion.activos_ti?.codigo_inventario;
    
    const ok = await this.confirm.confirm(
      `¿Confirmas la devolución del equipo ${equipo} por parte de ${empleado}? El equipo volverá al almacén como "Disponible".`
    );
    if (!ok) return;

    this.isLoading.set(true);
    try {
      await this.inv.devolverAsignacion(asignacion.id, asignacion.activo_id);
      
      this.toast.success("Equipo devuelto al almacén exitosamente");
      await this.loadData(); // Recargar tablas

      // Auditoría
      await this.historial.registrar(
        "asignaciones",
        asignacion.activo_id,
        "devolucion",
        `El empleado ${empleado} devolvió el equipo ${equipo} al inventario.`,
        this.userId() ?? undefined
      );

      // Ajustar página si se vacía la actual
      if (this.paginatedAsignaciones().length === 0 && this.currentPage() > 1) {
        this.currentPage.update((p) => p - 1);
      }

    } catch (err) {
      console.error("Error devolviendo equipo", err);
      this.toast.error("Error al procesar la devolución");
    } finally {
      this.isLoading.set(false);
    }
  }
}