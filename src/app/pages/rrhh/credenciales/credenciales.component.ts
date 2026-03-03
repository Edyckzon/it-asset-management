import { Component, OnInit, signal, inject, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { RrhhService } from "../../../shared/services/rrhh.service";
import { HistorialService } from "../../../shared/services/historial.service";
import { SupabaseService } from "../../../shared/services/supabase.service";
import { ToastService } from "../../../shared/services/toast.service";
import { Empleado, Credencial } from "../../../shared/models/rrhh.model";

@Component({
  selector: "app-credenciales",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="p-4">
      <h2 class="text-xl font-semibold mb-4">Credenciales / Accesos</h2>

      <form
        [formGroup]="credForm"
        (ngSubmit)="onAdd()"
        class="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3"
      >
        <div>
          <label class="block text-sm text-slate-600">Empleado</label>
          <select
            formControlName="empleado_id"
            class="mt-1 block w-full rounded border px-2 py-1"
          >
            <option value="">-- Seleccionar --</option>
            <option *ngFor="let e of empleados()" [value]="e.id">
              {{ e.nombre_completo }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm text-slate-600">Sistema</label>
          <input
            formControlName="sistema"
            class="mt-1 block w-full rounded border px-2 py-1"
          />
        </div>

        <div>
          <label class="block text-sm text-slate-600">Tipo acceso</label>
          <input
            formControlName="tipo_acceso"
            class="mt-1 block w-full rounded border px-2 py-1"
          />
        </div>

        <div>
          <label class="block text-sm text-slate-600">Usuario</label>
          <input
            formControlName="usuario"
            class="mt-1 block w-full rounded border px-2 py-1"
          />
        </div>

        <div>
          <label class="block text-sm text-slate-600">Contraseña</label>
          <input
            formControlName="contrasena"
            class="mt-1 block w-full rounded border px-2 py-1"
          />
        </div>

        <div>
          <label class="block text-sm text-slate-600">URL (opcional)</label>
          <input
            formControlName="url_acceso"
            class="mt-1 block w-full rounded border px-2 py-1"
          />
        </div>

        <div class="md:col-span-3">
          <label class="block text-sm text-slate-600">Notas</label>
          <input
            formControlName="notas"
            class="mt-1 block w-full rounded border px-2 py-1"
          />
        </div>

        <div class="md:col-span-3 text-right">
          <button type="submit" class="btn btn-primary mt-2">
            Agregar credencial
          </button>
        </div>
      </form>

      <div class="mb-3">
        <input
          placeholder="Filtrar por empleado o usuario"
          class="w-full rounded border px-2 py-1"
          [value]="filterName()"
          (input)="filterName.set($any($event.target).value)"
        />
      </div>

      <div class="overflow-x-auto">
        <table class="table-auto w-full border-collapse">
          <thead>
            <tr class="text-left bg-slate-100">
              <th class="p-2">Empleado</th>
              <th class="p-2">Sistema</th>
              <th class="p-2">Tipo</th>
              <th class="p-2">Usuario</th>
              <th class="p-2">Contraseña</th>
              <th class="p-2">URL</th>
              <th class="p-2">Notas</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of filteredCredenciales()" class="border-t">
              <td class="p-2">{{ c.empleados?.nombre_completo || "-" }}</td>
              <td class="p-2">{{ c.sistema }}</td>
              <td class="p-2">{{ c.tipo_acceso }}</td>
              <td class="p-2">
                <input
                  class="w-full rounded border px-2 py-1"
                  [value]="c.usuario"
                  (blur)="
                    onFieldUpdate(c.id, { usuario: $any($event.target).value })
                  "
                />
              </td>
              <td class="p-2 flex items-center gap-2">
                <input
                  [type]="showPasswords()[c.id] ? 'text' : 'password'"
                  class="flex-1 rounded border px-2 py-1"
                  [value]="c.contrasena"
                  (blur)="
                    onFieldUpdate(c.id, {
                      contrasena: $any($event.target).value
                    })
                  "
                />
                <button type="button" class="px-2" (click)="toggleShow(c.id)">
                  {{ showPasswords()[c.id] ? "👁️" : "🙈" }}
                </button>
              </td>
              <td class="p-2">
                <input
                  class="w-full rounded border px-2 py-1"
                  [value]="c.url_acceso || ''"
                  (blur)="
                    onFieldUpdate(c.id, {
                      url_acceso: $any($event.target).value
                    })
                  "
                />
              </td>
              <td class="p-2">
                <input
                  class="w-full rounded border px-2 py-1"
                  [value]="c.notas || ''"
                  (blur)="
                    onFieldUpdate(c.id, { notas: $any($event.target).value })
                  "
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [``],
})
export class CredencialesComponent implements OnInit {
  private rrhh = inject(RrhhService);
  private historial = inject(HistorialService);
  private supabase = inject(SupabaseService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  userId: string | null = null;

  empleados = signal<Empleado[]>([]);
  credenciales = signal<any[]>([]);
  isLoading = signal(false);

  filterName = signal("");
  filteredCredenciales = computed(() => {
    const q = this.filterName().toLowerCase().trim();
    if (!q) return this.credenciales();
    return this.credenciales().filter((c) => {
      const nombre = (c.empleados?.nombre_completo || "").toLowerCase();
      const usuario = (c.usuario || "").toLowerCase();
      return nombre.includes(q) || usuario.includes(q);
    });
  });

  showPasswords = signal<Record<string, boolean>>({});

  credForm = this.fb.group({
    empleado_id: ["", [Validators.required]],
    sistema: ["", [Validators.required]],
    tipo_acceso: ["", [Validators.required]],
    usuario: ["", [Validators.required]],
    contrasena: ["", [Validators.required]],
    url_acceso: [""],
    notas: [""],
  });

  async ngOnInit(): Promise<void> {
    await this.loadData();
    // obtener user id para auditoría
    try {
      const u = await this.supabase.getUser();
      this.userId = u?.id ?? null;
    } catch (err) {
      console.warn('No se pudo obtener usuario para auditoría', err);
      this.userId = null;
    }
  }

  private async loadData() {
    this.isLoading.set(true);
    try {
      const [empleadosList, creds] = await Promise.all([
        this.rrhh.getEmpleados(),
        this.rrhh.getCredenciales(),
      ]);
      this.empleados.set(empleadosList);
      this.credenciales.set(creds);
    } catch (err) {
      console.error("Error cargando credenciales", err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onAdd() {
    if (this.credForm.invalid) return;
    this.isLoading.set(true);
    try {
      const payload = this.credForm.value as Partial<Credencial>;
      const created = await this.rrhh.createCredencial(payload);
      this.credenciales.update((c) => [...c, created]);
      this.credForm.reset();
      this.toast.success('Credencial creada correctamente');
    } catch (err) {
      console.error("Error creating credencial", err);
      this.toast.error('Error al crear credencial');
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleShow(id: string) {
    this.showPasswords.update((s) => ({ ...s, [id]: !s[id] }));
  }

  async onFieldUpdate(id: string, cambios: Partial<Credencial>) {
    try {
      const updated = await this.rrhh.updateCredencial(id, cambios);
      // replace in local list
      this.credenciales.update((list) =>
        list.map((i) => (i.id === id ? updated : i))
      );
      // Registrar en historial: indicar qué campo se actualizó y el sistema
      try {
        const campo = Object.keys(cambios)[0] || "campo";
        const original =
          this.credenciales().find((i) => i.id === id) || updated;
        const sistema = original?.sistema || updated?.sistema || "";
        await this.historial.registrar(
          "credenciales",
          id,
          "actualizacion",
          `Se actualizó ${campo} del sistema ${sistema}`,
          this.userId ?? undefined
        );
        this.toast.success('Credencial actualizada');
      } catch (histErr) {
        console.error("Error registrando historial de credencial", histErr);
      }
    } catch (err) {
      console.error("Error actualizando credencial", err);
      this.toast.error('Error al actualizar credencial');
    }
  }
}
