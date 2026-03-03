import { Injectable } from "@angular/core";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { environment } from "../../../environments/environment";
import { CompraHardware, ActivoTI } from "../models/inventario.model";

@Injectable({ providedIn: "root" })
export class InventarioService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
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
    compra: Omit<CompraHardware, "id">
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
}
