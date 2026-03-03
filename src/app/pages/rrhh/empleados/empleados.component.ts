import { Component, OnInit, signal, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { RrhhService } from "../../../shared/services/rrhh.service";
import { HistorialService } from "../../../shared/services/historial.service";
import { ConfirmService } from "../../../shared/services/confirm.service";
import { SupabaseService } from "../../../shared/services/supabase.service";
import { ToastService } from "../../../shared/services/toast.service";
import { Area } from "../../../shared/models/rrhh.model";

@Component({
  selector: "app-empleados",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./empleados.component.html", // <-- ¡AQUÍ ESTÁ EL CAMBIO!
  styles: [``],
})
export class EmpleadosComponent implements OnInit {
  private rrhh = inject(RrhhService);
  private historial = inject(HistorialService);
  private confirm = inject(ConfirmService);
  private supabase = inject(SupabaseService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  empleados = signal<any[]>([]);
  areas = signal<Area[]>([]);
  isLoading = signal(false);

  empleadoForm = this.fb.group({
    nombre_completo: ["", [Validators.required]],
    area_id: ["", [Validators.required]],
    cargo: ["", [Validators.required]],
  });

  async ngOnInit(): Promise<void> {
    await this.loadData();
    // obtener user id para auditoría
    try {
      const u = await this.supabase.getUser();
      // lo dejamos disponible en closure via this.supabase.getUser() cuando sea necesario
    } catch (err) {
      console.warn('No se pudo obtener usuario para auditoría', err);
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
      this.toast.success('Empleado creado correctamente');
    } catch (err) {
      console.error("Error creating empleado", err);
      this.toast.error('Error al crear empleado');
    } finally {
      this.isLoading.set(false);
    }
  }

  async onDelete(emp: any) {
    const ok = await this.confirm.confirm(`¿Eliminar empleado ${emp.nombre_completo}?`);
    if (!ok) return;
    this.isLoading.set(true);
    try {
      await this.rrhh.deleteEmpleado(emp.id);
      // actualizar lista local
      this.empleados.update((list) => list.filter((e) => e.id !== emp.id));
      // registrar en historial con user_id si existe
      try {
        const u = await this.supabase.getUser();
        await this.historial.registrar(
          'rrhh',
          emp.id,
          'eliminacion',
          `Empleado ${emp.nombre_completo} eliminado`,
          u?.id ?? undefined
        );
      } catch (histErr) {
        console.error('Error registrando historial al eliminar empleado', histErr);
      }
      this.toast.success('Empleado eliminado');
    } catch (err) {
      console.error('Error eliminando empleado', err);
      this.toast.error('Error al eliminar empleado');
    } finally {
      this.isLoading.set(false);
    }
  }
}
