import { Component, OnInit, signal, inject, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { RrhhService } from "../../../shared/services/rrhh.service";
import { HistorialService } from "../../../shared/services/historial.service";
import { SupabaseService } from "../../../shared/services/supabase.service";
import { ToastService } from "../../../shared/services/toast.service";
import { ExportService } from "../../../shared/services/export.service";
import { ConfirmService } from "../../../shared/services/confirm.service";
import { Empleado, Credencial } from "../../../shared/models/rrhh.model";
import { SearchableSelectComponent, SearchableSelectOption } from "../../../shared/components/form/searchable-select/searchable-select.component";

@Component({
  selector: "app-credenciales",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SearchableSelectComponent],
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
  private confirm = inject(ConfirmService);

  userId: string | null = null;

  empleados = signal<Empleado[]>([]);
  credenciales = signal<any[]>([]);
  isLoading = signal(false);

  filterName = signal("");

  empleadoOptions = computed<SearchableSelectOption[]>(() =>
    this.empleados().map((e) => ({
      value: e.id,
      label: e.nombre_completo,
      hint: e.cargo,
    })),
  );

  // Estado de edición (Patrón Cargar en Formulario)
  credencialEnEdicion = signal<any | null>(null);

  // Control para mostrar/ocultar contraseñas en la tabla
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

  // Lista filtrada por la búsqueda
  filteredCredenciales = computed(() => {
    const q = this.filterName().toLowerCase().trim();
    if (!q) return this.credenciales();
    return this.credenciales().filter((c) => {
      const nombre = (c.empleados?.nombre_completo || "").toLowerCase();
      const usuario = (c.usuario || "").toLowerCase();
      const sistema = (c.sistema || "").toLowerCase();
      return nombre.includes(q) || usuario.includes(q) || sistema.includes(q);
    });
  });

  // --- LÓGICA DE PAGINACIÓN ---
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(10); // 20 registros por página

  paginatedCredenciales = computed(() => {
    const page = this.currentPage();
    const per = this.itemsPerPage();
    const start = (page - 1) * per;
    return this.filteredCredenciales().slice(start, start + per);
  });

  totalPages = computed(() =>
    Math.ceil(this.filteredCredenciales().length / this.itemsPerPage()) || 1
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

  async ngOnInit(): Promise<void> {
    await this.loadData();
    try {
      const u = await this.supabase.getUser();
      this.userId = u?.id ?? null;
    } catch (err) {
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
      this.empleados.set(
        [...empleadosList].sort((a, b) =>
          a.nombre_completo.localeCompare(b.nombre_completo, "es", { sensitivity: "base" }),
        ),
      );
      this.credenciales.set(creds);
    } catch (err) {
      console.error("Error cargando credenciales", err);
      this.toast.error("Error al cargar los datos");
    } finally {
      this.isLoading.set(false);
    }
  }

  // --- LÓGICA DE FORMULARIO (CREAR Y ACTUALIZAR) ---
  async onSubmit() {
    if (this.credForm.invalid) return;
    this.isLoading.set(true);
    
    try {
      const payload = this.credForm.value as Partial<Credencial>;
      const editando = this.credencialEnEdicion();

      if (editando) {
        // ACTUALIZAR
        const updated = await this.rrhh.updateCredencial(editando.id, payload);
        this.credenciales.update((list) =>
          list.map((c) => (c.id === editando.id ? updated : c))
        );
        this.toast.success("Credencial actualizada correctamente");
        
        try {
          await this.historial.registrar(
            "credenciales", editando.id, "actualizacion",
            `Se actualizó la credencial del sistema ${updated.sistema}`,
            this.userId ?? undefined
          );
        } catch (e) {}

      } else {
        // CREAR
        const created = await this.rrhh.createCredencial(payload);
        this.credenciales.update((c) => [created, ...c]);
        this.toast.success("Credencial creada correctamente");
        this.currentPage.set(1);
      }

      this.cancelarEdicion();
    } catch (err) {
      console.error("Error guardando credencial", err);
      this.toast.error("Error al procesar la solicitud");
    } finally {
      this.isLoading.set(false);
    }
  }

  // --- INTERACCIÓN DE UI ---
  editar(cred: any) {
    this.credencialEnEdicion.set(cred);
    this.credForm.patchValue({
      empleado_id: cred.empleado_id,
      sistema: cred.sistema,
      tipo_acceso: cred.tipo_acceso,
      usuario: cred.usuario,
      contrasena: cred.contrasena,
      url_acceso: cred.url_acceso,
      notas: cred.notas
    });
    // Sube suavemente para que el usuario vea el formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicion() {
    this.credencialEnEdicion.set(null);
    this.credForm.reset({ empleado_id: "" });
  }

  toggleShow(id: string) {
    this.showPasswords.update((s) => ({ ...s, [id]: !s[id] }));
  }

  async onDelete(id: string) {
    const cred = this.credenciales().find((item) => item.id === id);
    const ok = await this.confirm.confirmCritical(
      `Vas a eliminar la credencial de ${cred?.sistema || "este sistema"} para ${cred?.empleados?.nombre_completo || "este empleado"}. Esta informacion es sensible.`,
      "Eliminar credencial",
      "Eliminar credencial",
    );
    if (!ok) return;

    try {
      await this.rrhh.deleteCredencial(id);
      this.credenciales.update((list) => list.filter((c) => c.id !== id));
      this.toast.success("Credencial eliminada");

      await this.historial.registrar(
        "credenciales", id, "eliminacion",
        `Se eliminó una credencial`, this.userId ?? undefined
      );
    } catch (err) {
      console.error("Error eliminando credencial", err);
      this.toast.error("No se pudo eliminar la credencial");
    }
  }

  // --- EXPORTACIÓN ---
  private getDatosLimpios() {
    return this.filteredCredenciales().map((cred) => ({
      Empleado: cred.empleados?.nombre_completo || "Sin Asignar",
      Sistema: cred.sistema,
      "Tipo de Acceso": cred.tipo_acceso,
      Usuario: cred.usuario,
      Contraseña: cred.contrasena, 
      URL: cred.url_acceso || "N/A",
      Notas: cred.notas || "N/A",
    }));
  }

  exportarExcel() {
    this.exportSvc.exportToExcel(this.getDatosLimpios(), "Reporte_Credenciales");
    this.toast.success("Bóveda exportada a Excel");
  }

  exportarPdf() {
    this.exportSvc.exportToPdf(
      this.getDatosLimpios(), "Reporte_Credenciales", "Bóveda de Credenciales y Accesos"
    );
    this.toast.success("Bóveda exportada a PDF");
  }
}
