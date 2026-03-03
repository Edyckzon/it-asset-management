import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { InventarioService } from '../../../shared/services/inventario.service';
import { CompraHardware } from '../../../shared/models/inventario.model';

@Component({
  selector: 'app-compras-hardware',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <div class="max-w-5xl mx-auto p-4">
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <form [formGroup]="compraForm" (ngSubmit)="onSubmit()" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Fecha compra</label>
          <input formControlName="fecha_compra" type="date" class="w-full h-10 px-3 rounded border border-gray-300" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
          <input formControlName="proveedor" type="text" placeholder="Proveedor" class="w-full h-10 px-3 rounded border border-gray-300" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tipo producto</label>
          <input formControlName="tipo_producto" type="text" placeholder="Laptop/Monitor/..." class="w-full h-10 px-3 rounded border border-gray-300" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Marca / Modelo</label>
          <input formControlName="marca_modelo" type="text" placeholder="Dell XPS 13" class="w-full h-10 px-3 rounded border border-gray-300" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
          <input formControlName="cantidad" type="number" min="1" class="w-full h-10 px-3 rounded border border-gray-300" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Precio unitario</label>
          <input formControlName="precio_unitario" type="number" step="0.01" class="w-full h-10 px-3 rounded border border-gray-300" />
        </div>

        <div class="md:col-span-3 text-right mt-2">
          <button type="submit" class="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg">Registrar Compra</button>
        </div>
      </form>
    </div>

    @if (isLoading()) {
      <div class="py-6 text-center text-gray-500">Cargando compras...</div>
    } @else {
      <div class="overflow-x-auto bg-white rounded-lg shadow-sm">
        <table class="min-w-full text-left">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-sm font-medium text-gray-600">Fecha</th>
              <th class="px-4 py-3 text-sm font-medium text-gray-600">Proveedor</th>
              <th class="px-4 py-3 text-sm font-medium text-gray-600">Producto</th>
              <th class="px-4 py-3 text-sm font-medium text-gray-600">Marca/Modelo</th>
              <th class="px-4 py-3 text-sm font-medium text-gray-600">Cantidad</th>
              <th class="px-4 py-3 text-sm font-medium text-gray-600">Precio Unit.</th>
            </tr>
          </thead>
          <tbody>
            @for (c of compras(); track c.id) {
              <tr class="border-t hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-700">{{ c.fecha_compra | date }}</td>
                <td class="px-4 py-3 text-sm text-gray-700">{{ c.proveedor }}</td>
                <td class="px-4 py-3 text-sm text-gray-700">{{ c.tipo_producto }}</td>
                <td class="px-4 py-3 text-sm text-gray-700">{{ c.marca_modelo }}</td>
                <td class="px-4 py-3 text-sm text-gray-700">{{ c.cantidad }}</td>
                <td class="px-4 py-3 text-sm text-gray-700">{{ c.precio_unitario | number:'1.2-2' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>
  `,
  styles: [``],
})
export class ComprasHardwareComponent implements OnInit {
  private inv = inject(InventarioService);
  private fb = inject(FormBuilder);

  compras = signal<CompraHardware[]>([]);
  isLoading = signal(false);

  compraForm = this.fb.group({
    fecha_compra: ['', [Validators.required]],
    proveedor: ['', [Validators.required]],
    tipo_producto: ['', [Validators.required]],
    marca_modelo: ['', [Validators.required]],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    precio_unitario: [0, [Validators.required, Validators.min(0)]],
  });

  async ngOnInit(): Promise<void> {
    await this.loadCompras();
  }

  private async loadCompras() {
    this.isLoading.set(true);
    try {
      const list = await this.inv.getCompras();
      this.compras.set(list);
    } catch (err) {
      console.error('Error loading compras', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSubmit() {
    if (this.compraForm.invalid) return;
    this.isLoading.set(true);
    try {
      const payload = this.compraForm.value as Omit<CompraHardware, 'id'>;
      const created = await this.inv.createCompra(payload);
      this.compras.update((c) => [created, ...c]);
      this.compraForm.reset({ cantidad: 1, precio_unitario: 0 });
    } catch (err) {
      console.error('Error creating compra', err);
    } finally {
      this.isLoading.set(false);
    }
  }
}
