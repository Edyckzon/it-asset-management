import { Component, inject, signal, OnInit, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { InventarioService } from "../../../shared/services/inventario.service";
import { RrhhService } from "../../../shared/services/rrhh.service";
import { HistorialService } from "../../../shared/services/historial.service";
import { SupabaseService } from "../../../shared/services/supabase.service";
import { ToastService } from "../../../shared/services/toast.service";
import { ExportService } from "../../../shared/services/export.service"; // <-- Servicio inyectado
import { ActivoTI } from "../../../shared/models/inventario.model";

@Component({
  selector: "app-activos",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./activos.component.html",
  styles: [``],
})
export class ActivosComponent implements OnInit {
  private inv = inject(InventarioService);
  private rrhh = inject(RrhhService);
  private historial = inject(HistorialService);
  private supabase = inject(SupabaseService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private exportSvc = inject(ExportService); // <-- Inyectado

  activos = signal<ActivoTI[]>([]);
  empleados = signal<any[]>([]);
  compras = signal<any[]>([]);
  isLoading = signal(false);
  userId = signal<string | null>(null);

  editing = signal<Record<string, boolean>>({});
  editBuffers = signal<Record<string, Partial<ActivoTI>>>({});

  activoForm = this.fb.group({
    codigo_inventario: ["", [Validators.required]],
    tipo_activo: ["", [Validators.required]],
    marca_modelo: [""],
    numero_serie: [""],
    nombre_pc: [""],
    direccion_mac: [""],
    direccion_ip: [""],
    compra_id: [null],
  });

  // --- LÓGICA DE PAGINACIÓN ---
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(5);

  paginatedActivos = computed(() => {
    const page = this.currentPage();
    const per = this.itemsPerPage();
    const start = (page - 1) * per;
    return this.activos().slice(start, start + per);
  });

  totalPages = computed(() =>
    Math.ceil(this.activos().length / this.itemsPerPage()),
  );

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.editing.set({});
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.editing.set({});
    }
  }
  // -----------------------------

  // --- MÉTODOS DE EXPORTACIÓN ---
  private getDatosLimpios() {
    return this.activos().map((a) => {
      // Cruzamos el ID del empleado con la lista local para sacar su nombre
      const empAsignado = this.empleados().find((e) => e.id === a.empleado_id);

      return {
        Código: a.codigo_inventario,
        Tipo: a.tipo_activo,
        "Marca/Modelo": a.marca_modelo || "-",
        "S/N": a.numero_serie || "-",
        "PC Name": a.nombre_pc || "-",
        IP: a.direccion_ip || "-",
        MAC: a.direccion_mac || "-",
        Estado: a.estado,
        "Asignado a": empAsignado
          ? empAsignado.nombre_completo
          : "Almacén / Sin Asignar",
      };
    });
  }

  exportarExcel() {
    this.exportSvc.exportToExcel(this.getDatosLimpios(), "Inventario_Activos");
    this.toast.success("Excel de Activos generado");
  }

  exportarPdf() {
    this.exportSvc.exportToPdf(
      this.getDatosLimpios(),
      "Inventario_Activos",
      "Inventario Oficial de Activos TI",
    );
    this.toast.success("PDF de Activos generado");
  }
  // ---------------------------------

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [emps, acts, comps, user] = await Promise.all([
        this.rrhh.getEmpleados(),
        this.inv.getActivos(),
        this.inv.getCompras(),
        this.supabase.getUser(),
      ]);
      this.empleados.set(emps);
      this.activos.set(acts);
      this.compras.set(comps);
      this.userId.set(user?.id ?? null);
    } catch (err) {
      console.error("Error al cargar datos del inventario", err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSubmit() {
    if (this.activoForm.invalid) {
      this.activoForm.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    try {
      const payload = { ...this.activoForm.value } as any;
      if (!payload.compra_id) payload.compra_id = null;

      const created = await this.inv.createActivo(payload);

      this.activos.update((list) => [created, ...list]);
      this.activoForm.reset({ tipo_activo: "" });

      await this.historial.registrar(
        "activos",
        created.id,
        "creacion",
        `Nuevo activo ${created.codigo_inventario} (${created.tipo_activo}) registrado`,
        this.userId() ?? undefined,
      );

      this.toast.success("Activo registrado con éxito");
      this.currentPage.set(1);
    } catch (err) {
      this.toast.error("Error al registrar el activo");
    } finally {
      this.isLoading.set(false);
    }
  }

  async onAssign(activoId: string, empleadoId: string) {
    try {
      const cambios = {
        empleado_id: empleadoId || null,
        estado: empleadoId ? "Asignado" : "Disponible",
      };
      const updated = await this.inv.updateActivo(activoId, cambios);
      this.activos.update((list) =>
        list.map((a) => (a.id === activoId ? updated : a)),
      );

      const det = empleadoId
        ? `Asignado a empleado ID: ${empleadoId}`
        : "Equipo desasignado (Vuelto a almacén)";
      await this.historial.registrar(
        "activos",
        activoId,
        "asignacion",
        det,
        this.userId() ?? undefined,
      );

      this.toast.success("Asignación actualizada");
    } catch (err) {
      this.toast.error("Error al actualizar asignación");
    }
  }

  startEdit(a: ActivoTI) {
    this.editing.update((e) => ({ ...e, [a.id]: true }));
    this.editBuffers.update((b) => ({ ...b, [a.id]: { ...a } }));
  }

  cancelEdit(id: string) {
    this.editing.update((e) => ({ ...e, [id]: false }));
  }

  onEditField(id: string, field: keyof ActivoTI, value: string) {
    this.editBuffers.update((b) => ({
      ...b,
      [id]: { ...b[id], [field]: value },
    }));
  }

  async saveEdit(id: string) {
    const buffer = { ...this.editBuffers()[id] }; // Hacemos una copia

    // 🧹 LIMPIEZA: Quitamos las propiedades relacionales antes de guardar
    delete (buffer as any).empleados;
    delete (buffer as any).compras_hardware; // Por si acaso también se coló

    try {
      const updated = await this.inv.updateActivo(
        id,
        buffer as Partial<ActivoTI>,
      );

      this.activos.update((list) =>
        list.map((item) => (item.id === id ? updated : item)),
      );

      this.cancelEdit(id);
      this.toast.success("Detalles técnicos actualizados");
    } catch (err) {
      console.error("Error al guardar cambios", err);
      this.toast.error("Error al guardar cambios");
    }
  }
}
