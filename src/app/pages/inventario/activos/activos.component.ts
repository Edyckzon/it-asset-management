import { Component, inject, signal, OnInit, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { InventarioService } from "../../../shared/services/inventario.service";
import { RrhhService } from "../../../shared/services/rrhh.service";
import { HistorialService } from "../../../shared/services/historial.service";
import { SupabaseService } from "../../../shared/services/supabase.service";
import { ToastService } from "../../../shared/services/toast.service";
import { ExportService } from "../../../shared/services/export.service";
import { ActivoTI } from "../../../shared/models/inventario.model";
import { SearchableSelectComponent, SearchableSelectOption } from "../../../shared/components/form/searchable-select/searchable-select.component";

@Component({
  selector: "app-activos",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SearchableSelectComponent],
  templateUrl: "./activos.component.html",
  styles: [``],
})
export class ActivosComponent implements OnInit {
  private inv = inject(InventarioService);
  private rrhh = inject(RrhhService);
  private historial = inject(HistorialService);
  private supabase = inject(SupabaseService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private exportSvc = inject(ExportService);

  activos = signal<ActivoTI[]>([]);
  empleados = signal<any[]>([]);
  compras = signal<any[]>([]);
  isLoading = signal(false);
  userId = signal<string | null>(null);
  searchTerm = signal("");
  estadoFilter = signal("TODOS");
  tipoFilter = signal("TODOS");
  empleadoFilter = signal("TODOS");
  currentPage = signal(1);
  itemsPerPage = signal(8);

  editing = signal<Record<string, boolean>>({});
  editBuffers = signal<Record<string, Partial<ActivoTI> | undefined>>({});

  estados = ["Disponible", "Asignado", "En Reparacion", "Baja"];
  tiposActivo = ["Laptop", "Desktop", "Monitor", "Mouse", "Teclado", "AIO", "Impresora", "Celular", "Tablet", "Servidor", "Red"];

  tipoActivoOptions = computed<SearchableSelectOption[]>(() =>
    this.tiposActivo.map((tipo) => ({ value: tipo, label: tipo })),
  );

  compraOptions = computed<SearchableSelectOption[]>(() =>
    this.compras().map((c) => ({
      value: c.id,
      label: `${c.tipo_producto} - ${c.proveedor}`,
      hint: `${c.fecha_compra ? new Date(c.fecha_compra).toLocaleDateString("es-PE") : "Sin fecha"} | ${c.moneda || "PEN"}`,
    })),
  );

  activoForm = this.fb.group({
    codigo_inventario: ["", [Validators.required]],
    tipo_activo: ["", [Validators.required]],
    marca_modelo: [""],
    numero_serie: [""],
    nombre_pc: [""],
    direccion_mac: [""],
    direccion_ip: [""],
    compra_id: [null],
    ubicacion: [""],
    fecha_garantia_fin: [""],
    observaciones: [""],
  });

  filteredActivos = computed(() => {
    const term = this.normalize(this.searchTerm());
    const estado = this.estadoFilter();
    const tipo = this.tipoFilter();
    const empleado = this.empleadoFilter();

    return this.activos().filter((a) => {
      const searchable = this.normalize(
        [
          a.codigo_inventario,
          a.tipo_activo,
          a.marca_modelo,
          a.numero_serie,
          a.nombre_pc,
          a.direccion_ip,
          a.direccion_mac,
          a.ubicacion,
          a.empleados?.nombre_completo,
        ].join(" "),
      );
      const matchesEmpleado =
        empleado === "TODOS" ||
        (empleado === "SIN_ASIGNAR" && !a.empleado_id) ||
        a.empleado_id === empleado;

      return (
        (!term || searchable.includes(term)) &&
        (estado === "TODOS" || a.estado === estado) &&
        (tipo === "TODOS" || a.tipo_activo === tipo) &&
        matchesEmpleado
      );
    });
  });

  paginatedActivos = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return this.filteredActivos().slice(start, start + this.itemsPerPage());
  });

  totalPages = computed(() =>
    Math.ceil(this.filteredActivos().length / this.itemsPerPage()),
  );

  inventoryStats = computed(() => {
    const source = this.filteredActivos();
    return {
      total: source.length,
      disponibles: source.filter((a) => a.estado === "Disponible").length,
      asignados: source.filter((a) => a.estado === "Asignado").length,
      baja: source.filter((a) => a.estado === "Baja").length,
    };
  });

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [emps, acts, comps, user] = await Promise.all([
        this.rrhh.getEmpleados(),
        this.inv.getActivos(),
        this.inv.getCompras(),
        this.supabase.getUser(),
      ]);
      this.empleados.set(emps);
      this.activos.set(acts);
      this.compras.set(comps);
      this.userId.set(user?.id ?? null);
    } catch (err) {
      console.error("Error al cargar datos del inventario", err);
      this.toast.error("No se pudo cargar el inventario");
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSubmit() {
    if (this.activoForm.invalid) {
      this.activoForm.markAllAsTouched();
      this.toast.error("Completa codigo y tipo de activo");
      return;
    }
    this.isLoading.set(true);
    try {
      const payload = { ...this.activoForm.value } as any;
      if (!payload.compra_id) payload.compra_id = null;
      if (!payload.fecha_garantia_fin) payload.fecha_garantia_fin = null;

      const created = await this.inv.createActivo(payload);
      this.activos.update((list) => [created, ...list]);
      this.activoForm.reset({ tipo_activo: "", compra_id: null });

      await this.historial.registrar(
        "activos",
        created.id,
        "creacion",
        `Nuevo activo ${created.codigo_inventario} (${created.tipo_activo}) registrado`,
        this.userId() ?? undefined,
      );

      this.toast.success("Activo registrado con exito");
      this.currentPage.set(1);
    } catch (err) {
      console.error("Error al registrar el activo", err);
      this.toast.error("No se pudo registrar. Revisa si la migracion SQL ya fue aplicada.");
    } finally {
      this.isLoading.set(false);
    }
  }

  async onAssign(activoId: string, empleadoId: string) {
    try {
      const cambios = {
        empleado_id: empleadoId || null,
        estado: empleadoId ? "Asignado" : "Disponible",
      };
      const updated = await this.inv.updateActivo(activoId, cambios);
      this.activos.update((list) =>
        list.map((a) => (a.id === activoId ? updated : a)),
      );

      await this.historial.registrar(
        "activos",
        activoId,
        "asignacion",
        empleadoId ? `Asignado a empleado ID: ${empleadoId}` : "Equipo desasignado",
        this.userId() ?? undefined,
      );

      this.toast.success("Asignacion actualizada");
    } catch (err) {
      this.toast.error("Error al actualizar asignacion");
    }
  }

  startEdit(a: ActivoTI) {
    this.editing.update((e) => ({ ...e, [a.id]: true }));
    this.editBuffers.update((b) => ({ ...b, [a.id]: { ...a } }));
  }

  cancelEdit(id: string) {
    this.editing.update((e) => ({ ...e, [id]: false }));
  }

  onEditField(id: string, field: keyof ActivoTI, value: string | null) {
    this.editBuffers.update((b) => ({
      ...b,
      [id]: { ...(b[id] ?? {}), [field]: value },
    }));
  }

  async saveEdit(id: string) {
    const buffer = { ...(this.editBuffers()[id] ?? {}) };
    delete (buffer as any).empleados;
    delete (buffer as any).compras_hardware;

    if (!buffer.compra_id) buffer.compra_id = null;
    if (!buffer.empleado_id) buffer.empleado_id = null;
    if (!buffer.fecha_garantia_fin) buffer.fecha_garantia_fin = null;

    try {
      const updated = await this.inv.updateActivo(id, buffer);
      this.activos.update((list) =>
        list.map((item) => (item.id === id ? updated : item)),
      );
      this.cancelEdit(id);
      this.toast.success("Activo actualizado");
    } catch (err) {
      console.error("Error al guardar cambios", err);
      this.toast.error("Error al guardar cambios");
    }
  }

  exportarExcel() {
    this.exportSvc.exportToExcel(this.getDatosLimpios(), "Inventario_Activos");
    this.toast.success("Excel de activos generado");
  }

  exportarPdf() {
    this.exportSvc.exportToPdf(
      this.getDatosLimpios(),
      "Inventario_Activos",
      "Inventario Oficial de Activos TI",
    );
    this.toast.success("PDF de activos generado");
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.editing.set({});
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.editing.set({});
    }
  }

  onSearch(value: string) {
    this.searchTerm.set(value);
    this.resetPagingState();
  }

  onEstadoFilter(value: string) {
    this.estadoFilter.set(value);
    this.resetPagingState();
  }

  onTipoFilter(value: string) {
    this.tipoFilter.set(value);
    this.resetPagingState();
  }

  onEmpleadoFilter(value: string) {
    this.empleadoFilter.set(value);
    this.resetPagingState();
  }

  onItemsPerPage(value: string) {
    this.itemsPerPage.set(Number(value));
    this.resetPagingState();
  }

  resetFilters() {
    this.searchTerm.set("");
    this.estadoFilter.set("TODOS");
    this.tipoFilter.set("TODOS");
    this.empleadoFilter.set("TODOS");
    this.resetPagingState();
  }

  formatCompra(c: any) {
    if (!c) return "Sin compra vinculada";
    const fecha = c.fecha_compra
      ? new Date(c.fecha_compra).toLocaleDateString("es-PE")
      : "sin fecha";
    return `${c.proveedor || "Proveedor"} - ${fecha}`;
  }

  private getDatosLimpios() {
    return this.filteredActivos().map((a) => ({
      Codigo: a.codigo_inventario,
      Tipo: a.tipo_activo,
      "Marca/Modelo": a.marca_modelo || "-",
      Serie: a.numero_serie || "-",
      "PC Name": a.nombre_pc || "-",
      IP: a.direccion_ip || "-",
      MAC: a.direccion_mac || "-",
      Estado: a.estado,
      Ubicacion: a.ubicacion || "-",
      Garantia: a.fecha_garantia_fin || "-",
      "Asignado a": a.empleados?.nombre_completo || "Almacen / Sin asignar",
    }));
  }

  private resetPagingState() {
    this.currentPage.set(1);
    this.editing.set({});
  }

  private normalize(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }
}
