import { Injectable } from "@angular/core";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { environment } from "../../../environments/environment";
import { Area, Credencial } from "../models/rrhh.model";

@Injectable({ providedIn: "root" })
export class RrhhService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  // Obtiene todas las áreas
  async getAreas(): Promise<Area[]> {
    const { data, error } = await this.supabase.from("areas").select("*");
    if (error) throw error;
    return data ?? [];
  }

  // Crea un área y devuelve el registro creado
  async createArea(nombre: string): Promise<Area> {
    const { data, error } = await this.supabase
      .from("areas")
      .insert({ nombre })
      .select()
      .single();

    if (error) throw error;
    return data as Area;
  }

  // Obtiene empleados junto con el nombre de su área (relación)
  async getEmpleados(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from("empleados")
      .select("*, areas(nombre)");
    if (error) throw error;
    return data ?? [];
  }

  // Crea un empleado y devuelve el registro creado (incluyendo el nombre del área)
  async createEmpleado(empleado: {
    nombre_completo: string;
    area_id: string;
    cargo: string;
  }): Promise<any> {
    const { data, error } = await this.supabase
      .from("empleados")
      .insert(empleado)
      .select("*, areas(nombre)") // <-- ¡AQUÍ ESTÁ EL FIX!
      .single();

    if (error) throw error;
    return data;
  }

  // Credenciales (accesos)
  async getCredenciales(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from("credenciales")
      .select("*, empleados(nombre_completo)");
    if (error) throw error;
    return data ?? [];
  }

  async createCredencial(cred: Partial<Credencial>): Promise<any> {
    const { data, error } = await this.supabase
      .from("credenciales")
      .insert(cred)
      .select("*, empleados(nombre_completo)")
      .single();
    if (error) throw error;
    return data;
  }

  async updateCredencial(id: string, cambios: Partial<Credencial>): Promise<any> {
    const { data, error } = await this.supabase
      .from("credenciales")
      .update(cambios)
      .eq("id", id)
      .select("*, empleados(nombre_completo)")
      .single();
    if (error) throw error;
    return data;
  }

  // Elimina un empleado por id
  async deleteEmpleado(id: string): Promise<void> {
    const { error } = await this.supabase.from("empleados").delete().eq("id", id);
    if (error) throw error;
  }
}
