import { Component, OnInit, signal, inject, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";

// 🔥 Importaciones con la ruta exacta que me diste 🔥
import { NetworkService } from "../../../shared/services/network.service";
import { RrhhService } from "../../../shared/services/rrhh.service";
import { ConfirmService } from "../../../shared/services/confirm.service";
import { SupabaseService } from "../../../shared/services/supabase.service";
import { ToastService } from "../../../shared/services/toast.service";
import { ExportService } from "../../../shared/services/export.service";
import { HistorialService } from "../../../shared/services/historial.service";

@Component({
  selector: "app-ac-users",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./ac-users.component.html"
})
export class AcUsersComponent implements OnInit {
  private netSvc = inject(NetworkService);
  private rrhh = inject(RrhhService);
  private historial = inject(HistorialService);
  private confirm = inject(ConfirmService);
  private supabase = inject(SupabaseService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private exportSvc = inject(ExportService); // Usamos tu servicio premium

  usuarios = signal<any[]>([]);
  empleadosDisponibles = signal<any[]>([]);
  isLoading = signal(false);
  
  usuarioEnEdicion = signal<any | null>(null);

  adForm = this.fb.group({
    empleado_id: ["", [Validators.required]],
    username_ad: ["", [Validators.required]],
    password_ad: [""], 
    grupo_ad: [""],
    organizational_unit: [""]
  });

  // --- LÓGICA DE PAGINACIÓN ---
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(10); 

  paginatedUsuarios = computed(() => {
    const page = this.currentPage();
    const per = this.itemsPerPage();
    const start = (page - 1) * per;
    return this.usuarios().slice(start, start + per);
  });

  totalPages = computed(() => Math.ceil(this.usuarios().length / this.itemsPerPage()) || 1);

  nextPage() { if (this.currentPage() < this.totalPages()) this.currentPage.update((p) => p + 1); }
  prevPage() { if (this.currentPage() > 1) this.currentPage.update((p) => p - 1); }

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  private async loadData() {
    this.isLoading.set(true);
    try {
      const [empleadosList, usuariosAdList] = await Promise.all([
        this.rrhh.getEmpleados(),
        this.netSvc.getUsuariosAD(),
      ]);
      this.empleadosDisponibles.set(empleadosList);
      this.usuarios.set(usuariosAdList || []);
    } catch (err) {
      this.toast.error("Error cargando datos de Active Directory");
    } finally {
      this.isLoading.set(false);
    }
  }

  // --- LÓGICA DE EXPORTACIÓN (EXCEL Y PDF) ---
  private getDatosLimpios() {
    return this.usuarios().map((u) => ({
      "Empleado": u.empleados?.nombre_completo || "Desconocido",
      "Username AD": u.username_ad,
      "Contraseña": u.password_ad || "***",
      "Grupo": u.grupo_ad || "-",
      "OU": u.organizational_unit || "-",
      "Estado": u.estado_cuenta ? "Activo" : "Bloqueado",
      "Fecha Registro": new Date(u.fecha_creacion).toLocaleDateString()
    }));
  }

  exportarExcel() {
    this.exportSvc.exportToExcel(this.getDatosLimpios(), "Cuentas_AD", "Reporte de Accesos - Active Directory");
    this.toast.success("Excel generado correctamente");
  }

  exportarPdf() {
    this.exportSvc.exportToPdf(this.getDatosLimpios(), "Cuentas_AD", "Reporte Oficial de Cuentas AD");
    this.toast.success("PDF generado correctamente");
  }

  // --- LÓGICA DE GUARDAR (CREAR Y EDITAR) ---
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

  // --- MÉTODOS PARA LA INTERFAZ ---
  editar(user: any) {
    this.usuarioEnEdicion.set(user);
    this.adForm.patchValue({
      empleado_id: user.empleado_id,
      username_ad: user.username_ad,
      password_ad: user.password_ad,
      grupo_ad: user.grupo_ad,
      organizational_unit: user.organizational_unit
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicion() {
    this.usuarioEnEdicion.set(null);
    this.adForm.reset({ empleado_id: '' }); 
  }

  // --- BAJA LÓGICA / BLOQUEO ---
  async toggleEstado(user: any) {
    const accionText = user.estado_cuenta ? 'Bloquear' : 'Activar';
    const ok = await this.confirm.confirm(`¿Estás seguro de ${accionText} la cuenta ${user.username_ad}?`);
    
    if (!ok) return;
    
    this.isLoading.set(true);
    try {
      const nuevoEstado = !user.estado_cuenta;
      await this.netSvc.actualizarUsuarioAD(user.id, { estado_cuenta: nuevoEstado });
      
      this.usuarios.update(list => list.map(u => u.id === user.id ? { ...u, estado_cuenta: nuevoEstado } : u));
      this.toast.success(`Cuenta ${nuevoEstado ? 'activada' : 'bloqueada'} correctamente`);

      try {
        const currentUser = await this.supabase.getUser();
        await this.historial.registrar(
          "network", user.id, nuevoEstado ? "DESBLOQUEO AD" : "BLOQUEO AD",
          `Se cambió el estado de red a ${nuevoEstado ? 'Activo' : 'Bloqueado'} para el usuario ${user.username_ad}`,
          currentUser?.id
        );
      } catch (e) {}

    } catch (err) {
      this.toast.error("Error al cambiar estado de la cuenta");
    } finally {
      this.isLoading.set(false);
    }
  }
}