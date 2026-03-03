import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { InventarioService } from "../../../shared/services/inventario.service";
import { RrhhService } from "../../../shared/services/rrhh.service";
import { HistorialService } from "../../../shared/services/historial.service";
import { SupabaseService } from "../../../shared/services/supabase.service";
import { ToastService } from "../../../shared/services/toast.service";
import { ActivoTI } from "../../../shared/models/inventario.model";

@Component({
  selector: "app-activos",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./activos.component.html", // <-- ¡Apuntando al nuevo archivo!
  styles: [``],
})
export class ActivosComponent implements OnInit {
  private inv = inject(InventarioService);
  private rrhh = inject(RrhhService);
  private historial = inject(HistorialService);
  private supabase = inject(SupabaseService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  activos = signal<ActivoTI[]>([]);
  empleados = signal<any[]>([]);
  compras = signal<any[]>([]);
  isLoading = signal(false);
  userId = signal<string | null>(null);

  // Estados de edición inline
  editing = signal<Record<string, boolean>>({});
  editBuffers = signal<Record<string, Partial<ActivoTI>>>({});

  // Formulario de creación
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

      // Auditoría
      await this.historial.registrar(
        "activos",
        created.id,
        "creacion",
        `Nuevo activo ${created.codigo_inventario} (${created.tipo_activo}) registrado`,
        this.userId() ?? undefined
      );

      this.toast.success("Activo registrado con éxito");
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
        list.map((a) => (a.id === activoId ? updated : a))
      );

      // Auditoría de asignación
      const det = empleadoId
        ? `Asignado a empleado ID: ${empleadoId}`
        : "Equipo desasignado (Vuelto a almacén)";
      await this.historial.registrar(
        "activos",
        activoId,
        "asignacion",
        det,
        this.userId() ?? undefined
      );

      this.toast.success("Asignación actualizada");
    } catch (err) {
      this.toast.error("Error al actualizar asignación");
    }
  }

  // Lógica de Edición Inline
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
    const buffer = this.editBuffers()[id];
    try {
      const updated = await this.inv.updateActivo(
        id,
        buffer as Partial<ActivoTI>
      );
      this.activos.update((list) =>
        list.map((item) => (item.id === id ? updated : item))
      );
      this.cancelEdit(id);
      this.toast.success("Detalles técnicos actualizados");
    } catch (err) {
      this.toast.error("Error al guardar cambios");
    }
  }
}
