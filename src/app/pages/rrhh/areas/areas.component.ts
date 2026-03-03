import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RrhhService } from '../../../shared/services/rrhh.service';
import { ToastService } from '../../../shared/services/toast.service'; // <-- 1. Importa el servicio
import { Area } from '../../../shared/models/rrhh.model';

@Component({
  selector: 'app-areas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './areas.component.html',
  styles: [``],
})
export class AreasComponent implements OnInit {
  private rrhh = inject(RrhhService);
  private toast = inject(ToastService); // <-- 2. Inyecta el servicio

  areas = signal<Area[]>([]);
  isLoading = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadAreas();
  }

  async loadAreas() {
    this.isLoading.set(true);
    try {
      const list = await this.rrhh.getAreas();
      this.areas.set(list);
    } catch (err) {
      console.error('Error loading areas', err);
      this.toast.error('No se pudieron cargar las áreas'); // Opcional: aviso de error
    } finally {
      this.isLoading.set(false);
    }
  }

  async addArea(nombre: string) {
    const name = (nombre || '').trim();
    if (!name) {
      this.toast.error('El nombre del área no puede estar vacío');
      return;
    }
    
    this.isLoading.set(true);
    try {
      const created = await this.rrhh.createArea(name);
      this.areas.update((arr) => [...arr, created]);
      
      // 3. ¡Aquí está la magia verde!
      this.toast.success(`Área "${name}" creada correctamente`); 
      
    } catch (err) {
      console.error('Error creating area', err);
      this.toast.error('Hubo un error al crear el área'); // Aviso rojo si falla
    } finally {
      this.isLoading.set(false);
    }
  }
}