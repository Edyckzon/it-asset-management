import { Injectable } from "@angular/core";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class HistorialService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  /**
   * Registra un movimiento en la tabla historial_movimientos.
   * Espera que la tabla tenga al menos: modulo, registro_id, accion, detalle y una marca de tiempo.
   */
  async registrar(
    modulo: string,
    registro_id: string,
    accion: string,
    detalle: string,
    user_id?: string
  ): Promise<void> {
    const payload: any = {
      modulo,
      registro_id,
      accion,
      detalle,
    };
    if (user_id) payload.user_id = user_id;

    const { error } = await this.supabase
      .from("historial_movimientos")
      .insert(payload);
    if (error) throw error;
  }

  /**
   * Obtiene todos los registros, ordenados por fecha desc (asume columna fecha_creacion o created_at)
   */
  async getAll(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from("historial_movimientos")
      .select("*")
      .order("fecha", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }
}
