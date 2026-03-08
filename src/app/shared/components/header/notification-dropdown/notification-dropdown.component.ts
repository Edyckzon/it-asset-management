import { CommonModule, DatePipe } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { RouterModule } from "@angular/router";
import { DropdownComponent } from "../../ui/dropdown/dropdown.component";
import { DropdownItemComponent } from "../../ui/dropdown/dropdown-item/dropdown-item.component";
// 🔥 Importamos tu servicio de Historial 🔥
import { HistorialService } from "../../../services/historial.service";

@Component({
  selector: "app-notification-dropdown",
  templateUrl: "./notification-dropdown.component.html",
  // Agregamos DatePipe para formatear la fecha
  imports: [
    CommonModule,
    RouterModule,
    DropdownComponent,
    DropdownItemComponent,
    DatePipe,
  ],
})
export class NotificationDropdownComponent implements OnInit {
  isOpen = false;
  notifying = true;

  private historialSvc = inject(HistorialService);

  // Señal para guardar la lista de notificaciones
  notificaciones = signal<any[]>([]);

  async ngOnInit() {
    try {
      // Traemos todo el historial
      const data = await this.historialSvc.getAll();
      // Cortamos el arreglo para mostrar solo los 5 más recientes
      this.notificaciones.set(data.slice(0, 5));
    } catch (error) {
      console.error("Error cargando notificaciones:", error);
    }
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
    // Al abrir el panel, apagamos la alerta (el punto naranja)
    if (this.isOpen) {
      this.notifying = false;
    }
  }

  closeDropdown() {
    this.isOpen = false;
  }
}
