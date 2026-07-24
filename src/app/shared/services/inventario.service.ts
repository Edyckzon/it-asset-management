import { Injectable } from "@angular/core";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { environment } from "../../../environments/environment";
import { CompraHardware, ActivoTI } from "../models/inventario.model";

@Injectable({ providedIn: "root" })
export class InventarioService {
  private supabase: SupabaseClient;
  private readonly storageBucket = "inventario-ti";

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
    );
  }

  async getCompras(): Promise<CompraHardware[]> {
    const { data, error } = await this.supabase
      .from("compras_hardware")
      .select("*")
      .order("fecha_compra", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async createCompra(
    compra: Omit<CompraHardware, "id">,
  ): Promise<CompraHardware> {
    const { data, error } = await this.supabase
      .from("compras_hardware")
      .insert(compra)
      .select()
      .single();

    if (error) throw error;
    return data as CompraHardware;
  }

  async updateCompra(
    id: string,
    cambios: Partial<CompraHardware>,
  ): Promise<CompraHardware> {
    const { data, error } = await this.supabase
      .from("compras_hardware")
      .update(cambios)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as CompraHardware;
  }

  async uploadCompraComprobante(compraId: string, file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const safeName = file.name
      .replace(/\.[^/.]+$/, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
    const path = `compras/${compraId}/${Date.now()}-${safeName || "comprobante"}.${ext}`;

    const { error } = await this.supabase.storage
      .from(this.storageBucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;

    return {
      comprobante_path: path,
      comprobante_nombre: file.name,
      comprobante_tipo: file.type || "application/octet-stream",
    };
  }

  async getSignedFileUrl(path: string, expiresInSeconds = 3600) {
    const { data, error } = await this.supabase.storage
      .from(this.storageBucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error) throw error;
    return data.signedUrl;
  }

  async deleteFile(path: string) {
    const { error } = await this.supabase.storage
      .from(this.storageBucket)
      .remove([path]);

    if (error) throw error;
  }

  async getActivos(): Promise<ActivoTI[]> {
    const { data, error } = await this.supabase
      .from("activos_ti")
      .select(
        "*, empleados(nombre_completo), compras_hardware(fecha_compra, proveedor, precio_unitario)",
      )
      .order("codigo_inventario", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async updateActivo(id: string, cambios: Partial<ActivoTI>): Promise<ActivoTI> {
    const { data, error } = await this.supabase
      .from("activos_ti")
      .update(cambios)
      .eq("id", id)
      .select(
        "*, empleados(nombre_completo), compras_hardware(fecha_compra, proveedor, precio_unitario)",
      )
      .single();
    if (error) throw error;
    return data as ActivoTI;
  }

  async createActivo(activo: Omit<ActivoTI, "id">): Promise<ActivoTI> {
    const { data, error } = await this.supabase
      .from("activos_ti")
      .insert(activo)
      .select()
      .single();
    if (error) throw error;
    return data as ActivoTI;
  }

  async getAsignacionesActivas() {
    const { data, error } = await this.supabase
      .from("asignaciones")
      .select(
        "*, empleados(nombre_completo), activos_ti(codigo_inventario, tipo_activo, marca_modelo)",
      )
      .is("fecha_devolucion", null)
      .order("fecha_asignacion", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async crearAsignacion(payload: any) {
    const { data: asignacion, error: errorAsig } = await this.supabase
      .from("asignaciones")
      .insert(payload)
      .select(
        "*, empleados(nombre_completo), activos_ti(codigo_inventario, tipo_activo)",
      )
      .single();

    if (errorAsig) throw errorAsig;

    const { error: errorActivo } = await this.supabase
      .from("activos_ti")
      .update({ estado: "Asignado", empleado_id: payload.empleado_id })
      .eq("id", payload.activo_id);

    if (errorActivo) throw errorActivo;

    return asignacion;
  }

  async devolverAsignacion(asignacionId: string, activoId: string) {
    const fechaHoy = new Date().toISOString().split("T")[0];
    const { error: errorAsig } = await this.supabase
      .from("asignaciones")
      .update({ fecha_devolucion: fechaHoy })
      .eq("id", asignacionId);

    if (errorAsig) throw errorAsig;

    const { error: errorActivo } = await this.supabase
      .from("activos_ti")
      .update({ estado: "Disponible", empleado_id: null })
      .eq("id", activoId);

    if (errorActivo) throw errorActivo;

    return true;
  }
}
