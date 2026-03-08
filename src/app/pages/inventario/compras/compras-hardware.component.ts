import { Component, inject, signal, OnInit, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { InventarioService } from "../../../shared/services/inventario.service";
import { CompraHardware } from "../../../shared/models/inventario.model";
import { ToastService } from "../../../shared/services/toast.service";
import { ExportService } from "../../../shared/services/export.service"; // <-- Importado

@Component({
  selector: "app-compras-hardware",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./compras-hardware.component.html",
  styles: [``],
})
export class ComprasHardwareComponent implements OnInit {
  private inv = inject(InventarioService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private exportSvc = inject(ExportService); // <-- Inyectado

  compras = signal<CompraHardware[]>([]);
  isLoading = signal(false);

  compraForm = this.fb.group({
    fecha_compra: ["", [Validators.required]],
    proveedor: ["", [Validators.required]],
    tipo_producto: ["", [Validators.required]],
    marca_modelo: ["", [Validators.required]],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    precio_unitario: [0, [Validators.required, Validators.min(0)]],
  });

  // --- LÓGICA DE PAGINACIÓN ---
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(5);

  paginatedCompras = computed(() => {
    const page = this.currentPage();
    const per = this.itemsPerPage();
    const start = (page - 1) * per;
    return this.compras().slice(start, start + per);
  });

  totalPages = computed(() =>
    Math.ceil(this.compras().length / this.itemsPerPage()),
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
  private getDatosLimpios() {
    return this.compras().map((c) => {
      const total = c.cantidad * c.precio_unitario;
      return {
        "Fecha de Compra": new Date(c.fecha_compra).toLocaleDateString(),
        Proveedor: c.proveedor,
        Producto: c.tipo_producto,
        "Marca/Modelo": c.marca_modelo,
        Cantidad: c.cantidad,
        "Precio Unitario": `$${c.precio_unitario.toFixed(2)}`,
        "Costo Total": `$${total.toFixed(2)}`,
      };
    });
  }

  exportarExcel() {
    this.exportSvc.exportToExcel(
      this.getDatosLimpios(),
      "Reporte_Compras_Hardware",
    );
    this.toast.success("Excel de compras generado");
  }

  exportarPdf() {
    this.exportSvc.exportToPdf(
      this.getDatosLimpios(),
      "Reporte_Compras_Hardware",
      "Reporte Oficial de Adquisición de Hardware",
    );
    this.toast.success("PDF de compras generado");
  }
  // ---------------------------------

  async ngOnInit(): Promise<void> {
    await this.loadCompras();
  }

  private async loadCompras() {
    this.isLoading.set(true);
    try {
      const list = await this.inv.getCompras();
      this.compras.set(list);
    } catch (err) {
      console.error("Error loading compras", err);
      this.toast.error("Error al cargar el registro de compras");
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSubmit() {
    if (this.compraForm.invalid) {
      this.toast.error("Por favor, completa todos los campos requeridos");
      return;
    }

    this.isLoading.set(true);
    try {
      const payload = this.compraForm.value as Omit<CompraHardware, "id">;
      const created = await this.inv.createCompra(payload);

      this.compras.update((c) => [created, ...c]);
      this.compraForm.reset({ cantidad: 1, precio_unitario: 0 });
      this.toast.success("Compra de hardware registrada correctamente");

      this.currentPage.set(1);
    } catch (err) {
      console.error("Error creating compra", err);
      this.toast.error("Hubo un error al registrar la compra");
    } finally {
      this.isLoading.set(false);
    }
  }
}
