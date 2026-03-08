import { Component, OnInit, signal, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
// Importamos TODOS tus servicios
import { RrhhService } from "../../../shared/services/rrhh.service";
import { InventarioService } from "../../../shared/services/inventario.service";
import { HistorialService } from "../../../shared/services/historial.service";
import { EquipoService } from "../../../shared/services/equipo.service";

@Component({
  selector: "app-ecommerce",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./ecommerce.component.html",
})
export class EcommerceComponent implements OnInit {
  private rrhh = inject(RrhhService);
  private inv = inject(InventarioService);
  private historial = inject(HistorialService);
  private equiposSvc = inject(EquipoService);

  // --- SEÑALES PARA LAS MÉTRICAS ---
  totalEmpleados = signal(0);
  totalEquipos = signal(0);
  
  // Hardware
  activosDisponibles = signal(0);
  activosAsignados = signal(0);
  activosEnReparacion = signal(0);
  
  // Financiero & Accesos
  inversionTotal = signal(0);
  totalCredenciales = signal(0);
  
  // Tablas
  ultimosMovimientos = signal<any[]>([]);
  ultimasAsignaciones = signal<any[]>([]);
  
  isLoading = signal(true);

  async ngOnInit(): Promise<void> {
    try {
      this.isLoading.set(true);
      
      const [empleados, activos, movimientos, compras, asignaciones, credenciales, equipos] = await Promise.all([
        this.rrhh.getEmpleados(),
        this.inv.getActivos(),
        this.historial.getAll(),
        this.inv.getCompras(),
        this.inv.getAsignacionesActivas(), // 🔥 AQUÍ ESTÁ LA CORRECCIÓN
        this.rrhh.getCredenciales(),
        this.equiposSvc.getEquipos()
      ]);

      // 1. Personal y Grupos
      this.totalEmpleados.set((empleados || []).filter(e => e.estado === true).length);
      this.totalEquipos.set((equipos || []).length);

      // 2. Hardware
      const acts: any[] = activos || [];
      this.activosDisponibles.set(acts.filter((a) => a.estado === "Disponible").length);
      this.activosAsignados.set(acts.filter((a) => a.estado === "Asignado").length);
      this.activosEnReparacion.set(acts.filter((a) => a.estado === "En Reparación").length);

      // 3. Financiero (Sumar total de compras: Cantidad * Precio)
      const totalDinero = (compras || []).reduce((acc, current) => acc + (current.cantidad * current.precio_unitario), 0);
      this.inversionTotal.set(totalDinero);

      // 4. Seguridad (Credenciales)
      this.totalCredenciales.set((credenciales || []).length);

      // 5. Tablas de Resumen (Solo las últimas)
      this.ultimosMovimientos.set((movimientos || []).slice(0, 6)); 
      this.ultimasAsignaciones.set((asignaciones || []).slice(0, 5)); 
      
    } catch (err) {
      console.error("Error cargando dashboard TI", err);
    } finally {
      this.isLoading.set(false);
    }
  }
}