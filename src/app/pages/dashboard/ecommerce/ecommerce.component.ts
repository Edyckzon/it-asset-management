import { Component, OnInit, signal, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { EcommerceMetricsComponent } from "../../../shared/components/ecommerce/ecommerce-metrics/ecommerce-metrics.component";
import { MonthlySalesChartComponent } from "../../../shared/components/ecommerce/monthly-sales-chart/monthly-sales-chart.component";
import { MonthlyTargetComponent } from "../../../shared/components/ecommerce/monthly-target/monthly-target.component";
import { StatisticsChartComponent } from "../../../shared/components/ecommerce/statics-chart/statics-chart.component";
import { DemographicCardComponent } from "../../../shared/components/ecommerce/demographic-card/demographic-card.component";
import { RecentOrdersComponent } from "../../../shared/components/ecommerce/recent-orders/recent-orders.component";
import { RrhhService } from "../../../shared/services/rrhh.service";
import { InventarioService } from "../../../shared/services/inventario.service";
import { HistorialService } from "../../../shared/services/historial.service";

@Component({
  selector: "app-ecommerce",
  imports: [
    CommonModule,
    EcommerceMetricsComponent,
    MonthlySalesChartComponent,
    MonthlyTargetComponent,
    StatisticsChartComponent,
    DemographicCardComponent,
    RecentOrdersComponent,
  ],
  templateUrl: "./ecommerce.component.html",
})
export class EcommerceComponent implements OnInit {
  private rrhh = inject(RrhhService);
  private inv = inject(InventarioService);
  private historial = inject(HistorialService);

  totalEmpleados = signal(0);
  activosDisponibles = signal(0);
  activosAsignados = signal(0);
  ultimosMovimientos = signal<any[]>([]);

  constructor() {}

  async ngOnInit(): Promise<void> {
    try {
      const [empleados, activos, movimientos] = await Promise.all([
        this.rrhh.getEmpleados(),
        this.inv.getActivos(),
        this.historial.getAll(),
      ]);

      this.totalEmpleados.set((empleados || []).length);

      const acts: any[] = activos || [];
      const disponibles = acts.filter((a) => a.estado === "Disponible").length;
      const asignados = acts.filter((a) => a.estado === "Asignado").length;
      this.activosDisponibles.set(disponibles);
      this.activosAsignados.set(asignados);

      this.ultimosMovimientos.set((movimientos || []).slice(0, 5));
    } catch (err) {
      console.error("Error cargando dashboard TI", err);
    }
  }
}
