import { Injectable } from "@angular/core";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { environment } from "../../../environments/environment";
import { CompraHardware, ActivoTI } from "../models/inventario.model";

@Injectable({ providedIn: "root" })
export class InventarioService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
    );
  }

  // Obtiene las compras de hardware ordenadas por fecha (desc)
  async getCompras(): Promise<CompraHardware[]> {
    const { data, error } = await this.supabase
      .from("compras_hardware")
      .select("*")
      .order("fecha_compra", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  // Crea una compra y devuelve el registro creado
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

  // Obtiene los activos individuales (incluye nombre del empleado asignado si existe)
  async getActivos(): Promise<ActivoTI[]> {
    const { data, error } = await this.supabase
      .from("activos_ti")
      .select("*, empleados(nombre_completo)")
      .order("nombre_pc", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  // Actualiza un activo por id
  async updateActivo(id: string, cambios: Partial<ActivoTI>): Promise<any> {
    const { data, error } = await this.supabase
      .from("activos_ti")
      .update(cambios)
      .eq("id", id)
      .select("*, empleados(nombre_completo)") // <-- Agregamos la relación aquí
      .single();
    if (error) throw error;
    return data;
  }

  // Crea un activo nuevo
  async createActivo(activo: Omit<ActivoTI, "id">): Promise<ActivoTI> {
    const { data, error } = await this.supabase
      .from("activos_ti")
      .insert(activo)
      .select()
      .single();
    if (error) throw error;
    return data as ActivoTI;
  }

  // ==========================================
  // --- NUEVOS MÉTODOS PARA ASIGNACIONES ---
  // ==========================================

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
    // 1. Creamos el registro de asignación
    const { data: asignacion, error: errorAsig } = await this.supabase
      .from("asignaciones")
      .insert(payload)
      .select(
        "*, empleados(nombre_completo), activos_ti(codigo_inventario, tipo_activo)",
      )
      .single();

    if (errorAsig) throw errorAsig;

    // 2. Actualizamos el estado del activo a "Asignado"
    const { error: errorActivo } = await this.supabase
      .from("activos_ti")
      .update({ estado: "Asignado", empleado_id: payload.empleado_id })
      .eq("id", payload.activo_id);

    if (errorActivo) throw errorActivo;

    return asignacion;
  }

  async devolverAsignacion(asignacionId: string, activoId: string) {
    // 1. Marcamos la asignación como devuelta
    const fechaHoy = new Date().toISOString().split("T")[0];
    const { error: errorAsig } = await this.supabase
      .from("asignaciones")
      .update({ fecha_devolucion: fechaHoy })
      .eq("id", asignacionId);

    if (errorAsig) throw errorAsig;

    // 2. Liberamos el activo
    const { error: errorActivo } = await this.supabase
      .from("activos_ti")
      .update({ estado: "Disponible", empleado_id: null })
      .eq("id", activoId);

    if (errorActivo) throw errorActivo;

    return true;
  }
}
