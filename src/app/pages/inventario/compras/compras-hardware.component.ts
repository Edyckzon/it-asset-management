import { Component, inject, signal, OnInit, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { InventarioService } from "../../../shared/services/inventario.service";
import { CompraHardware, MonedaCompra } from "../../../shared/models/inventario.model";
import { ToastService } from "../../../shared/services/toast.service";
import { ExportService } from "../../../shared/services/export.service";
import { ConfirmService } from "../../../shared/services/confirm.service";

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
  private exportSvc = inject(ExportService);
  private confirm = inject(ConfirmService);

  compras = signal<CompraHardware[]>([]);
  isLoading = signal(false);
  searchTerm = signal("");
  currencyFilter = signal<"TODAS" | MonedaCompra>("TODAS");
  providerFilter = signal("TODOS");
  currentPage = signal(1);
  itemsPerPage = signal(8);
  compraEnEdicion = signal<CompraHardware | null>(null);
  selectedFile = signal<File | null>(null);
  signedUrls = signal<Record<string, string>>({});
  previewFile = signal<{ compra: CompraHardware; url: string } | null>(null);

  compraForm = this.fb.group({
    fecha_compra: ["", [Validators.required]],
    proveedor: ["", [Validators.required]],
    tipo_producto: ["", [Validators.required]],
    marca_modelo: ["", [Validators.required]],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    precio_unitario: [0, [Validators.required, Validators.min(0)]],
    moneda: ["PEN", [Validators.required]],
    tipo_cambio: [3.75, [Validators.required, Validators.min(0.01)]],
    numero_documento: [""],
    observaciones: [""],
  });

  providers = computed(() =>
    Array.from(
      new Set(this.compras().map((c) => c.proveedor).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b)),
  );

  filteredCompras = computed(() => {
    const term = this.normalize(this.searchTerm());
    const currency = this.currencyFilter();
    const provider = this.providerFilter();

    return this.compras().filter((c) => {
      const searchable = this.normalize(
        [
          c.proveedor,
          c.tipo_producto,
          c.marca_modelo,
          c.numero_documento,
          c.observaciones,
        ].join(" "),
      );
      return (
        (!term || searchable.includes(term)) &&
        (currency === "TODAS" || (c.moneda || "USD") === currency) &&
        (provider === "TODOS" || c.proveedor === provider)
      );
    });
  });

  paginatedCompras = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return this.filteredCompras().slice(start, start + this.itemsPerPage());
  });

  totalPages = computed(() =>
    Math.ceil(this.filteredCompras().length / this.itemsPerPage()),
  );

  totals = computed(() =>
    this.filteredCompras().reduce(
      (acc, c) => {
        const moneda = c.moneda || "USD";
        const tc = Number(c.tipo_cambio || 1);
        const total = this.totalCompra(c);
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

  async ngOnInit(): Promise<void> {
    await this.loadCompras();
  }

  async onSubmit() {
    if (this.compraForm.invalid) {
      this.compraForm.markAllAsTouched();
      this.toast.error("Completa los campos obligatorios de la compra");
      return;
    }

    this.isLoading.set(true);
    try {
      const payload = this.compraForm.value as Omit<CompraHardware, "id">;
      const editando = this.compraEnEdicion();
      let saved = editando
        ? await this.inv.updateCompra(editando.id, payload)
        : await this.inv.createCompra(payload);

      const file = this.selectedFile();
      if (file) {
        const filePayload = await this.inv.uploadCompraComprobante(saved.id, file);
        saved = await this.inv.updateCompra(saved.id, filePayload);
        await this.loadSignedUrl(saved);
      }

      if (editando) {
        this.compras.update((items) =>
          items.map((item) => (item.id === saved.id ? saved : item)),
        );
        this.toast.success("Compra actualizada correctamente");
      } else {
        this.compras.update((items) => [saved, ...items]);
        this.currentPage.set(1);
        this.toast.success("Compra registrada correctamente");
      }

      this.cancelEdit();
    } catch (err) {
      console.error("Error creating compra", err);
      const message = err instanceof Error ? err.message : "Error desconocido";
      this.toast.error(`No se pudo guardar: ${message}`);
    } finally {
      this.isLoading.set(false);
    }
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
      "Reporte Oficial de Adquisicion de Hardware",
    );
    this.toast.success("PDF de compras generado");
  }

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

  onSearch(value: string) {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  onCurrencyFilter(value: "TODAS" | MonedaCompra) {
    this.currencyFilter.set(value);
    this.currentPage.set(1);
  }

  onProviderFilter(value: string) {
    this.providerFilter.set(value);
    this.currentPage.set(1);
  }

  onItemsPerPage(value: string) {
    this.itemsPerPage.set(Number(value));
    this.currentPage.set(1);
  }

  resetFilters() {
    this.searchTerm.set("");
    this.currencyFilter.set("TODAS");
    this.providerFilter.set("TODOS");
    this.currentPage.set(1);
  }

  startEdit(compra: CompraHardware) {
    this.compraEnEdicion.set(compra);
    this.selectedFile.set(null);
    this.compraForm.patchValue({
      fecha_compra: compra.fecha_compra,
      proveedor: compra.proveedor,
      tipo_producto: compra.tipo_producto,
      marca_modelo: compra.marca_modelo,
      cantidad: compra.cantidad,
      precio_unitario: compra.precio_unitario,
      moneda: compra.moneda || "PEN",
      tipo_cambio: compra.tipo_cambio || 3.75,
      numero_documento: compra.numero_documento || "",
      observaciones: compra.observaciones || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  cancelEdit() {
    this.compraEnEdicion.set(null);
    this.selectedFile.set(null);
    this.compraForm.reset({
      cantidad: 1,
      precio_unitario: 0,
      moneda: "PEN",
      tipo_cambio: 3.75,
    });
  }

  async onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] || null;
    if (!file) {
      this.selectedFile.set(null);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      this.toast.error("Sube JPG, PNG, WEBP o PDF");
      (event.target as HTMLInputElement).value = "";
      return;
    }

    try {
      const normalizedFile = file.type === "application/pdf"
        ? file
        : await this.compressImage(file);

      if (normalizedFile.size > 5 * 1024 * 1024) {
        this.toast.error("El comprobante no debe superar 5 MB");
        (event.target as HTMLInputElement).value = "";
        return;
      }

      this.selectedFile.set(normalizedFile);
      if (normalizedFile.name !== file.name || normalizedFile.size < file.size) {
        this.toast.success(
          `Imagen optimizada: ${this.formatBytes(file.size)} -> ${this.formatBytes(normalizedFile.size)}`,
        );
      }
    } catch (err) {
      console.error("Error optimizando archivo", err);
      this.toast.error("No se pudo procesar la imagen");
      (event.target as HTMLInputElement).value = "";
      return;
    }
  }

  async openComprobante(compra: CompraHardware) {
    if (!compra.comprobante_path) return;
    try {
      const existing = this.signedUrls()[compra.comprobante_path];
      const url = existing || (await this.loadSignedUrl(compra));
      this.previewFile.set({ compra, url });
    } catch (err) {
      console.error("Error abriendo comprobante", err);
      this.toast.error("No se pudo abrir el comprobante. Revisa politicas Storage.");
    }
  }

  closePreview() {
    this.previewFile.set(null);
  }

  openPreviewExternal() {
    const preview = this.previewFile();
    if (!preview) return;
    window.open(preview.url, "_blank", "noopener,noreferrer");
  }

  isPreviewImage() {
    const tipo = this.previewFile()?.compra.comprobante_tipo || "";
    const nombre = this.previewFile()?.compra.comprobante_nombre || "";
    return tipo.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(nombre);
  }

  isPreviewPdf() {
    const tipo = this.previewFile()?.compra.comprobante_tipo || "";
    const nombre = this.previewFile()?.compra.comprobante_nombre || "";
    return tipo === "application/pdf" || /\.pdf$/i.test(nombre);
  }

  clearSelectedFile(fileInput?: HTMLInputElement) {
    this.selectedFile.set(null);
    if (fileInput) fileInput.value = "";
  }

  async deleteComprobante(compra: CompraHardware) {
    if (!compra.comprobante_path) return;

    const ok = await this.confirm.confirmCritical(
      `Vas a eliminar el comprobante ${compra.comprobante_nombre || "de esta compra"}. La compra queda, pero el archivo se borra del Storage.`,
      "Eliminar comprobante",
      "Eliminar archivo",
    );
    if (!ok) return;

    this.isLoading.set(true);
    try {
      await this.inv.deleteFile(compra.comprobante_path);
      const updated = await this.inv.updateCompra(compra.id, {
        comprobante_path: null,
        comprobante_nombre: null,
        comprobante_tipo: null,
      });

      this.signedUrls.update((items) => {
        const next = { ...items };
        delete next[compra.comprobante_path as string];
        return next;
      });

      this.compras.update((items) =>
        items.map((item) => (item.id === compra.id ? updated : item)),
      );

      if (this.compraEnEdicion()?.id === compra.id) {
        this.compraEnEdicion.set(updated);
      }

      this.toast.success("Comprobante eliminado");
    } catch (err) {
      console.error("Error eliminando comprobante", err);
      const message = err instanceof Error ? err.message : "Error desconocido";
      this.toast.error(`No se pudo eliminar: ${message}`);
    } finally {
      this.isLoading.set(false);
    }
  }

  formatMoney(value: number, currency: string = "USD") {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  totalCompra(c: CompraHardware) {
    return Number(c.cantidad || 0) * Number(c.precio_unitario || 0);
  }

  private async loadCompras() {
    this.isLoading.set(true);
    try {
      const list = await this.inv.getCompras();
      this.compras.set(list);
      await Promise.all(list.filter((c) => c.comprobante_path).map((c) => this.loadSignedUrl(c)));
    } catch (err) {
      console.error("Error loading compras", err);
      this.toast.error("Error al cargar el registro de compras");
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadSignedUrl(compra: CompraHardware) {
    if (!compra.comprobante_path) return "";
    const url = await this.inv.getSignedFileUrl(compra.comprobante_path);
    this.signedUrls.update((items) => ({
      ...items,
      [compra.comprobante_path as string]: url,
    }));
    return url;
  }

  private async compressImage(file: File): Promise<File> {
    const bitmap = await createImageBitmap(file);
    const maxSize = 1280;
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo crear canvas de compresion");

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.55),
    );

    if (!blob) throw new Error("No se pudo comprimir la imagen");

    const safeBaseName = file.name
      .replace(/\.[^/.]+$/, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "comprobante";

    return new File([blob], `${safeBaseName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  }

  private formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private getDatosLimpios() {
    return this.filteredCompras().map((c) => {
      const moneda = c.moneda || "USD";
      return {
        Fecha: new Date(c.fecha_compra).toLocaleDateString("es-PE"),
        Proveedor: c.proveedor,
        Producto: c.tipo_producto,
        "Marca/Modelo": c.marca_modelo,
        Cantidad: c.cantidad,
        Moneda: moneda,
        "Tipo de Cambio": c.tipo_cambio || "-",
        "Precio Unitario": this.formatMoney(c.precio_unitario, moneda),
        Total: this.formatMoney(this.totalCompra(c), moneda),
        Documento: c.numero_documento || "-",
      };
    });
  }

  private normalize(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }
}
