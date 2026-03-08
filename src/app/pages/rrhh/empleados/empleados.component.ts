import { Component, OnInit, signal, inject, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { RrhhService } from "../../../shared/services/rrhh.service";
import { HistorialService } from "../../../shared/services/historial.service";
import { ConfirmService } from "../../../shared/services/confirm.service";
import { SupabaseService } from "../../../shared/services/supabase.service";
import { ToastService } from "../../../shared/services/toast.service";
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
  private exportSvc = inject(ExportService);

  empleados = signal<any[]>([]);
  areas = signal<Area[]>([]);
  isLoading = signal(false);
  
  // Variable para saber si estamos creando o editando
  empleadoEnEdicion = signal<any | null>(null);

  empleadoForm = this.fb.group({
    nombre_completo: ["", [Validators.required]],
    area_id: ["", [Validators.required]],
    cargo: ["", [Validators.required]],
  });

  // --- LÓGICA DE PAGINACIÓN ---
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(10); // Aumenté a 10 por defecto

  paginatedEmpleados = computed(() => {
    const page = this.currentPage();
    const per = this.itemsPerPage();
    const start = (page - 1) * per;
    return this.empleados().slice(start, start + per);
  });

  totalPages = computed(() => Math.ceil(this.empleados().length / this.itemsPerPage()) || 1);

  nextPage() { if (this.currentPage() < this.totalPages()) this.currentPage.update((p) => p + 1); }
  prevPage() { if (this.currentPage() > 1) this.currentPage.update((p) => p - 1); }
  // -----------------------------

  async ngOnInit(): Promise<void> {
    await this.loadData();
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
      this.toast.error("Error cargando datos");
    } finally {
      this.isLoading.set(false);
    }
  }

  private getDatosLimpios() {
    return this.empleados().map((emp) => ({
      "Nombre Completo": emp.nombre_completo,
      Área: emp.areas?.nombre || "Sin Área",
      Cargo: emp.cargo,
      Estado: emp.estado ? "Activo" : "Inactivo (Cese)",
      "Fecha Registro": new Date(emp.fecha_creacion).toLocaleDateString(),
    }));
  }

  exportarExcel() {
    this.exportSvc.exportToExcel(this.getDatosLimpios(), "Reporte_Empleados");
    this.toast.success("Excel generado correctamente");
  }

  exportarPdf() {
    this.exportSvc.exportToPdf(this.getDatosLimpios(), "Reporte_Empleados", "Listado Oficial de Empleados");
    this.toast.success("PDF generado correctamente");
  }

  // --- LÓGICA DE GUARDAR (CREAR Y EDITAR) ---
  async onSubmit() {
    if (this.empleadoForm.invalid) return;
    this.isLoading.set(true);
    
    try {
      const payload = this.empleadoForm.value as any;
      const editando = this.empleadoEnEdicion();

      if (editando) {
        // ACTUALIZAR
        const actualizado = await this.rrhh.updateEmpleado(editando.id, payload);
        this.empleados.update(list => list.map(e => e.id === editando.id ? actualizado : e));
        this.toast.success("Empleado actualizado correctamente");
      } else {
        // CREAR NUEVO
        const created = await this.rrhh.createEmpleado(payload);
        this.empleados.update((e) => [created, ...e]); // Lo pone primero
        this.toast.success("Empleado creado correctamente");
        this.currentPage.set(1); // Va a la página 1 para verlo
      }

      this.cancelarEdicion();
    } catch (err) {
      this.toast.error("Error al guardar empleado");
    } finally {
      this.isLoading.set(false);
    }
  }

  // --- MÉTODOS PARA LA INTERFAZ ---
  editar(emp: any) {
    this.empleadoEnEdicion.set(emp);
    this.empleadoForm.patchValue({
      nombre_completo: emp.nombre_completo,
      area_id: emp.area_id,
      cargo: emp.cargo
    });
    // Hace scroll suave hacia arriba para ver el formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicion() {
    this.empleadoEnEdicion.set(null);
    this.empleadoForm.reset({ area_id: '' }); // Resetea dejando el select vacío
  }

  // --- BAJA LÓGICA ---
  async toggleEstado(emp: any) {
    const accionText = emp.estado ? 'Dar de Baja (Inactivar)' : 'Reactivar';
    const ok = await this.confirm.confirm(`¿Estás seguro de ${accionText} al empleado ${emp.nombre_completo}?`);
    
    if (!ok) return;
    
    this.isLoading.set(true);
    try {
      const nuevoEstado = !emp.estado;
      const actualizado = await this.rrhh.updateEmpleado(emp.id, { estado: nuevoEstado });
      
      this.empleados.update(list => list.map(e => e.id === emp.id ? actualizado : e));
      this.toast.success(`Empleado ${nuevoEstado ? 'activado' : 'inactivado'} correctamente`);

      // Registro en la caja negra
      try {
        const u = await this.supabase.getUser();
        await this.historial.registrar(
          "rrhh", emp.id, nuevoEstado ? "ALTA" : "BAJA",
          `Se cambió el estado a ${nuevoEstado ? 'Activo' : 'Inactivo'}`,
          u?.id
        );
      } catch (e) {}

    } catch (err) {
      this.toast.error("Error al cambiar estado");
    } finally {
      this.isLoading.set(false);
    }
  }
}