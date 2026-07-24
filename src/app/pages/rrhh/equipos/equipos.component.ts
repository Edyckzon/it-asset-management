import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EquipoService } from '../../../shared/services/equipo.service';
import { RrhhService } from '../../../shared/services/rrhh.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-equipos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './equipos.component.html'
})
export class EquiposComponent implements OnInit {
  private equipoSvc = inject(EquipoService);
  private rrhhSvc = inject(RrhhService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  equipos: any[] = [];
  empleados: any[] = [];
  isLoading = false;

  // Modal Nuevo Equipo
  isModalOpen = false;
  nuevoEquipo = { nombre_equipo: '', descripcion: '', lider_id: '' };

  // Modal Asignar Miembros
  isMiembrosModalOpen = false;
  equipoSeleccionado: any = null;
  miembrosSeleccionados: string[] = [];

  ngOnInit() {
    this.cargarDatos();
  }

  async cargarDatos() {
    this.isLoading = true;
    try {
      const [dataEquipos, dataEmpleados] = await Promise.all([
        this.equipoSvc.getEquipos(),
        this.rrhhSvc.getEmpleados()
      ]);
      
      this.empleados = dataEmpleados;
      
      // Magia: Cruzamos los datos aquí para evitar errores de SQL
      this.equipos = dataEquipos.map(eq => {
        const lider = this.empleados.find(e => e.id === eq.lider_id);
        const miembros = this.empleados.filter(e => e.equipo_id === eq.id);
        return { ...eq, lider, miembros };
      });

    } catch (error) {
      console.error('Error cargando datos', error);
    } finally {
      this.isLoading = false;
    }
  }

  // --- LÓGICA DE CREAR EQUIPO ---
  abrirModal() {
    this.nuevoEquipo = { nombre_equipo: '', descripcion: '', lider_id: '' };
    this.isModalOpen = true;
  }
  cerrarModal() { this.isModalOpen = false; }

  async guardarEquipo() {
    if (!this.nuevoEquipo.nombre_equipo) return alert('El nombre es obligatorio');
    try {
      const payload: any = { nombre_equipo: this.nuevoEquipo.nombre_equipo, descripcion: this.nuevoEquipo.descripcion };
      if (this.nuevoEquipo.lider_id) payload.lider_id = this.nuevoEquipo.lider_id;
      await this.equipoSvc.crearEquipo(payload);
      this.cerrarModal();
      this.cargarDatos();
    } catch (error) {
      alert('Error al guardar. Posible nombre duplicado.');
    }
  }

  async eliminar(id: string) {
    const equipo = this.equipos.find((item) => item.id === id);
    const ok = await this.confirm.confirmCritical(
      `Vas a eliminar el equipo ${equipo?.nombre_equipo || ""}. Los empleados no se borraran, pero quedaran sin equipo asignado.`,
      "Eliminar equipo",
      "Eliminar equipo",
    );
    if (ok) {
      await this.equipoSvc.eliminarEquipo(id);
      this.toast.success("Equipo eliminado correctamente");
      this.cargarDatos();
    }
  }

  // --- LÓGICA DE AÑADIR MIEMBROS ---
  abrirModalMiembros(equipo: any) {
    this.equipoSeleccionado = equipo;
    // Pre-seleccionamos los que ya están en el equipo
    this.miembrosSeleccionados = equipo.miembros.map((m: any) => m.id);
    this.isMiembrosModalOpen = true;
  }

  cerrarModalMiembros() { this.isMiembrosModalOpen = false; }

  toggleMiembro(empleadoId: string) {
    const index = this.miembrosSeleccionados.indexOf(empleadoId);
    if (index > -1) {
      this.miembrosSeleccionados.splice(index, 1); // Lo quita
    } else {
      this.miembrosSeleccionados.push(empleadoId); // Lo agrega
    }
  }

  async guardarMiembros() {
    try {
      await this.equipoSvc.actualizarMiembros(this.equipoSeleccionado.id, this.miembrosSeleccionados);
      this.cerrarModalMiembros();
      this.cargarDatos(); // Recargar para ver los cambios visuales
    } catch (error) {
      console.error('Error actualizando miembros', error);
    }
  }

  // Helper para sacar las iniciales (Ej: Edixon Paisic -> EP)
  getIniciales(nombre: string): string {
    return nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
}
