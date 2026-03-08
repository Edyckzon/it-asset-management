import { Component, OnInit, signal, inject, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { RrhhService } from "../../../shared/services/rrhh.service";
import { HistorialService } from "../../../shared/services/historial.service";
import { SupabaseService } from "../../../shared/services/supabase.service";
import { ToastService } from "../../../shared/services/toast.service";
import { ExportService } from "../../../shared/services/export.service";
import { Empleado, Credencial } from "../../../shared/models/rrhh.model";

@Component({
  selector: "app-credenciales",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./credenciales.component.html",
  styles: [``],
})
export class CredencialesComponent implements OnInit {
  private rrhh = inject(RrhhService);
  private historial = inject(HistorialService);
  private supabase = inject(SupabaseService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private exportSvc = inject(ExportService);

  userId: string | null = null;

  empleados = signal<Empleado[]>([]);
  credenciales = signal<any[]>([]);
  isLoading = signal(false);

  filterName = signal("");

  // Lista filtrada por la búsqueda
  filteredCredenciales = computed(() => {
    const q = this.filterName().toLowerCase().trim();
    if (!q) return this.credenciales();
    return this.credenciales().filter((c) => {
      const nombre = (c.empleados?.nombre_completo || "").toLowerCase();
      const usuario = (c.usuario || "").toLowerCase();
      return nombre.includes(q) || usuario.includes(q);
    });
  });

  // --- LÓGICA DE PAGINACIÓN ---
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(5);

  paginatedCredenciales = computed(() => {
    const page = this.currentPage();
    const per = this.itemsPerPage();
    const start = (page - 1) * per;
    return this.filteredCredenciales().slice(start, start + per);
  });

  totalPages = computed(() =>
    Math.ceil(this.filteredCredenciales().length / this.itemsPerPage()),
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

  // --- MÉTODOS DE EXPORTACIÓN ---

  // Función "limpiadora" para las credenciales
  private getDatosLimpios() {
    // Tomamos la lista FILTRADA para que exporte solo lo que se buscó
    return this.filteredCredenciales().map((cred) => ({
      Empleado: cred.empleados?.nombre_completo || "Sin Asignar",
      Sistema: cred.sistema,
      "Tipo de Acceso": cred.tipo_acceso,
      Usuario: cred.usuario,
      Contraseña: cred.contrasena, // Cuidado con exportar contraseñas en entornos reales!
      URL: cred.url_acceso || "N/A",
      Notas: cred.notas || "N/A",
    }));
  }

  exportarExcel() {
    const dataLimpia = this.getDatosLimpios();
    this.exportSvc.exportToExcel(dataLimpia, "Reporte_Credenciales");
    this.toast.success("Bóveda exportada a Excel");
  }

  exportarPdf() {
    const dataLimpia = this.getDatosLimpios();
    this.exportSvc.exportToPdf(
      dataLimpia,
      "Reporte_Credenciales",
      "Bóveda de Credenciales y Accesos TI",
    );
    this.toast.success("Bóveda exportada a PDF");
  }
  // ---------------------------------

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
    try {
      const u = await this.supabase.getUser();
      this.userId = u?.id ?? null;
    } catch (err) {
      console.warn("No se pudo obtener usuario para auditoría", err);
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

      this.credenciales.update((c) => [created, ...c]);
      this.credForm.reset();
      this.toast.success("Credencial creada correctamente");

      this.currentPage.set(1);
    } catch (err) {
      console.error("Error creating credencial", err);
      this.toast.error("Error al crear credencial");
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
      this.credenciales.update((list) =>
        list.map((i) => (i.id === id ? updated : i)),
      );

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
          this.userId ?? undefined,
        );
        this.toast.success("Credencial actualizada");
      } catch (histErr) {
        console.error("Error registrando historial de credencial", histErr);
      }
    } catch (err) {
      console.error("Error actualizando credencial", err);
      this.toast.error("Error al actualizar credencial");
    }
  }
}
