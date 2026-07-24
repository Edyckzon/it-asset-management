import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { RouterModule } from "@angular/router";
import { InventarioService } from "../../../shared/services/inventario.service";
import { HistorialService } from "../../../shared/services/historial.service";
import { ActivoTI, CompraHardware } from "../../../shared/models/inventario.model";

type ProcessStep = {
  title: string;
  description: string;
  path: string;
  cta: string;
  tone: "brand" | "success" | "warning" | "gray";
};

@Component({
  selector: "app-resumen-inventario",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./resumen-inventario.component.html",
})
export class ResumenInventarioComponent implements OnInit {
  private inv = inject(InventarioService);
  private historialSvc = inject(HistorialService);

  compras = signal<CompraHardware[]>([]);
  activos = signal<ActivoTI[]>([]);
  asignaciones = signal<any[]>([]);
  historial = signal<any[]>([]);
  isLoading = signal(false);

  activosAsignados = computed(() =>
    this.activos().filter((a) => this.normalize(a.estado) === "asignado").length,
  );

  activosDisponibles = computed(() =>
    this.activos().filter((a) => this.normalize(a.estado) === "disponible").length,
  );

  activosSinCompra = computed(() =>
    this.activos().filter((a) => !a.compra_id).length,
  );

  activosConGarantiaPorVencer = computed(() => {
    const today = new Date();
    const limit = new Date();
    limit.setDate(today.getDate() + 60);

    return this.activos().filter((activo) => {
      if (!activo.fecha_garantia_fin) return false;
      const fecha = new Date(`${activo.fecha_garantia_fin}T00:00:00`);
      return fecha >= today && fecha <= limit;
    }).length;
  });

  comprasConComprobante = computed(() =>
    this.compras().filter((c) => !!c.comprobante_path).length,
  );

  comprasSinComprobante = computed(() =>
    this.compras().filter((c) => !c.comprobante_path).length,
  );

  inversion = computed(() =>
    this.compras().reduce(
      (acc, compra) => {
        const cantidad = Number(compra.cantidad || 0);
        const precio = Number(compra.precio_unitario || 0);
        const total = cantidad * precio;
        const moneda = compra.moneda || "USD";
        const tc = Number(compra.tipo_cambio || 1);

        if (moneda === "PEN") {
          acc.pen += total;
          acc.usd += tc > 0 ? total / tc : 0;
        } else {
          acc.usd += total;
          acc.pen += total * tc;
        }
        return acc;
      },
      { usd: 0, pen: 0 },
    ),
  );

  coberturaDocumental = computed(() => {
    const total = this.compras().length;
    if (!total) return 0;
    return Math.round((this.comprasConComprobante() / total) * 100);
  });

  healthItems = computed(() => [
    {
      label: "Activos sin compra origen",
      value: this.activosSinCompra(),
      detail: "Conviene enlazarlos a una compra para trazabilidad.",
      status: this.activosSinCompra() > 0 ? "warning" : "ok",
    },
    {
      label: "Compras sin comprobante",
      value: this.comprasSinComprobante(),
      detail: "Subir comprobantes ayuda en auditoria y garantia.",
      status: this.comprasSinComprobante() > 0 ? "warning" : "ok",
    },
    {
      label: "Garantias por vencer",
      value: this.activosConGarantiaPorVencer(),
      detail: "Equipos con garantia terminando en los proximos 60 dias.",
      status: this.activosConGarantiaPorVencer() > 0 ? "warning" : "ok",
    },
  ]);

  processSteps: ProcessStep[] = [
    {
      title: "1. Compra",
      description: "Registra proveedor, moneda, TC, documento y comprobante.",
      path: "/inventario/compras",
      cta: "Ir a compras",
      tone: "brand",
    },
    {
      title: "2. Alta de activo",
      description: "Convierte la compra en equipos inventariables con serie, IP, ubicacion y garantia.",
      path: "/inventario/activos",
      cta: "Ir a activos",
      tone: "success",
    },
    {
      title: "3. Asignacion",
      description: "Entrega el activo a un empleado y controla devoluciones.",
      path: "/inventario/asignaciones",
      cta: "Ir a asignaciones",
      tone: "warning",
    },
    {
      title: "4. Auditoria",
      description: "Revisa cambios, bajas, devoluciones y acciones criticas.",
      path: "/inventario/historial",
      cta: "Ver auditoria",
      tone: "gray",
    },
  ];

  ultimosMovimientos = computed(() => this.historial().slice(0, 5));

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load() {
    this.isLoading.set(true);
    try {
      const [compras, activos, asignaciones, historial] = await Promise.all([
        this.inv.getCompras(),
        this.inv.getActivos(),
        this.inv.getAsignacionesActivas(),
        this.historialSvc.getAll(),
      ]);

      this.compras.set(compras);
      this.activos.set(activos);
      this.asignaciones.set(asignaciones);
      this.historial.set(historial);
    } catch (err) {
      console.error("Error cargando resumen de inventario", err);
    } finally {
      this.isLoading.set(false);
    }
  }

  formatMoney(value: number, currency: string) {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value || 0);
  }

  private normalize(value: string | null | undefined) {
    return (value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }
}
