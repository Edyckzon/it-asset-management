import { Component, OnInit, signal, inject, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { NetworkService } from "../../../shared/services/network.service";
import { RrhhService } from "../../../shared/services/rrhh.service";
import { ConfirmService } from "../../../shared/services/confirm.service";
import { SupabaseService } from "../../../shared/services/supabase.service";
import { ToastService } from "../../../shared/services/toast.service";
import { ExportService } from "../../../shared/services/export.service";
import { HistorialService } from "../../../shared/services/historial.service";
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from "../../../shared/components/form/searchable-select/searchable-select.component";

@Component({
  selector: "app-ac-users",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SearchableSelectComponent],
  templateUrl: "./ac-users.component.html",
})
export class AcUsersComponent implements OnInit {
  private netSvc = inject(NetworkService);
  private rrhh = inject(RrhhService);
  private historial = inject(HistorialService);
  private confirm = inject(ConfirmService);
  private supabase = inject(SupabaseService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private exportSvc = inject(ExportService);

  usuarios = signal<any[]>([]);
  empleadosDisponibles = signal<any[]>([]);
  isLoading = signal(false);
  usuarioEnEdicion = signal<any | null>(null);
  searchTerm = signal("");
  estadoFilter = signal("TODOS");
  currentPage = signal(1);
  itemsPerPage = signal(10);

  adForm = this.fb.group({
    empleado_id: ["", [Validators.required]],
    username_ad: ["", [Validators.required]],
    password_ad: [""],
    grupo_ad: [""],
    organizational_unit: [""],
  });

  empleadoOptions = computed<SearchableSelectOption[]>(() =>
    this.empleadosDisponibles().map((e) => ({
      value: e.id,
      label: e.nombre_completo,
      hint: e.cargo || e.areas?.nombre,
    })),
  );

  filteredUsuarios = computed(() => {
    const term = this.normalize(this.searchTerm());
    const estado = this.estadoFilter();
    return this.usuarios().filter((u) => {
      const searchable = this.normalize(
        `${u.empleados?.nombre_completo || ""} ${u.username_ad || ""} ${u.grupo_ad || ""} ${u.organizational_unit || ""}`,
      );
      return (
        (!term || searchable.includes(term)) &&
        (estado === "TODOS" ||
          (estado === "ACTIVO" && u.estado_cuenta) ||
          (estado === "BLOQUEADO" && !u.estado_cuenta))
      );
    });
  });

  paginatedUsuarios = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return this.filteredUsuarios().slice(start, start + this.itemsPerPage());
  });

  totalPages = computed(
    () => Math.ceil(this.filteredUsuarios().length / this.itemsPerPage()) || 1,
  );

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async onSubmit() {
    if (this.adForm.invalid) return;
    this.isLoading.set(true);

    try {
      const payload = this.adForm.value as any;
      const editando = this.usuarioEnEdicion();

      if (editando) {
        await this.netSvc.actualizarUsuarioAD(editando.id, payload);
        this.toast.success("Cuenta AD actualizada correctamente");
      } else {
        await this.netSvc.crearUsuarioAD(payload);
        this.toast.success("Cuenta AD registrada exitosamente");
        this.currentPage.set(1);
      }

      await this.loadData();
      this.cancelarEdicion();
    } catch (err) {
      this.toast.error("Error al guardar en Active Directory");
    } finally {
      this.isLoading.set(false);
    }
  }

  editar(user: any) {
    this.usuarioEnEdicion.set(user);
    this.adForm.patchValue({
      empleado_id: user.empleado_id,
      username_ad: user.username_ad,
      password_ad: user.password_ad,
      grupo_ad: user.grupo_ad,
      organizational_unit: user.organizational_unit,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  cancelarEdicion() {
    this.usuarioEnEdicion.set(null);
    this.adForm.reset({ empleado_id: "" });
  }

  async toggleEstado(user: any) {
    const accionText = user.estado_cuenta ? "bloquear" : "activar";
    const ok = await this.confirm.confirmCritical(
      `Confirmas ${accionText} la cuenta ${user.username_ad}? Esto afecta el acceso operativo del usuario.`,
      user.estado_cuenta ? "Bloquear cuenta AD" : "Activar cuenta AD",
      user.estado_cuenta ? "Bloquear" : "Activar",
    );
    if (!ok) return;

    this.isLoading.set(true);
    try {
      const nuevoEstado = !user.estado_cuenta;
      await this.netSvc.actualizarUsuarioAD(user.id, {
        estado_cuenta: nuevoEstado,
      });

      this.usuarios.update((list) =>
        list.map((u) =>
          u.id === user.id ? { ...u, estado_cuenta: nuevoEstado } : u,
        ),
      );
      this.toast.success(`Cuenta ${nuevoEstado ? "activada" : "bloqueada"}`);

      try {
        const currentUser = await this.supabase.getUser();
        await this.historial.registrar(
          "network",
          user.id,
          nuevoEstado ? "DESBLOQUEO AD" : "BLOQUEO AD",
          `Se cambio el estado de red a ${nuevoEstado ? "Activo" : "Bloqueado"} para ${user.username_ad}`,
          currentUser?.id,
        );
      } catch (e) {}
    } catch (err) {
      this.toast.error("Error al cambiar estado de la cuenta");
    } finally {
      this.isLoading.set(false);
    }
  }

  exportarExcel() {
    this.exportSvc.exportToExcel(
      this.getDatosLimpios(),
      "Cuentas_AD",
      "Reporte de Accesos - Active Directory",
    );
    this.toast.success("Excel generado correctamente");
  }

  exportarPdf() {
    this.exportSvc.exportToPdf(
      this.getDatosLimpios(),
      "Cuentas_AD",
      "Reporte Oficial de Cuentas AD",
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

  onEstadoFilter(value: string) {
    this.estadoFilter.set(value);
    this.currentPage.set(1);
  }

  private async loadData() {
    this.isLoading.set(true);
    try {
      const [empleadosList, usuariosAdList] = await Promise.all([
        this.rrhh.getEmpleadosActivos(),
        this.netSvc.getUsuariosAD(),
      ]);
      this.empleadosDisponibles.set(
        [...empleadosList].sort((a, b) =>
          a.nombre_completo.localeCompare(b.nombre_completo, "es", {
            sensitivity: "base",
          }),
        ),
      );
      this.usuarios.set(
        [...(usuariosAdList || [])].sort((a, b) =>
          (a.username_ad || "").localeCompare(b.username_ad || "", "es", {
            sensitivity: "base",
          }),
        ),
      );
    } catch (err) {
      this.toast.error("Error cargando datos de Active Directory");
    } finally {
      this.isLoading.set(false);
    }
  }

  private getDatosLimpios() {
    return this.filteredUsuarios().map((u) => ({
      Empleado: u.empleados?.nombre_completo || "Desconocido",
      "Username AD": u.username_ad,
      Password: u.password_ad || "***",
      Grupo: u.grupo_ad || "-",
      OU: u.organizational_unit || "-",
      Estado: u.estado_cuenta ? "Activo" : "Bloqueado",
      "Fecha Registro": new Date(u.fecha_creacion).toLocaleDateString("es-PE"),
    }));
  }

  private normalize(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }
}
