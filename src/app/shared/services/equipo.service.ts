import { Injectable } from "@angular/core";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { environment } from "../../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class EquipoService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
    );
  }

  // 1. Traer todos los equipos con el nombre de su líder
  async getEquipos(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from("equipos")
      .select(
        `
        *,
        lider:empleados!lider_id(nombre_completo)
      `,
      )
      .order("fecha_creacion", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // 2. Crear un nuevo equipo
  async crearEquipo(equipo: {
    nombre_equipo: string;
    descripcion?: string;
    lider_id?: string;
  }): Promise<void> {
    const { error } = await this.supabase.from("equipos").insert(equipo);

    if (error) throw error;
  }

  // 3. Eliminar un equipo
  async eliminarEquipo(id: string): Promise<void> {
    const { error } = await this.supabase.from("equipos").delete().eq("id", id);

    if (error) throw error;
  }

  // 4. Actualizar los miembros de un equipo
  async actualizarMiembros(
    equipoId: string,
    empleadoIds: string[],
  ): Promise<void> {
    // Primero, quitamos a todos los que estaban en este equipo
    await this.supabase
      .from("empleados")
      .update({ equipo_id: null })
      .eq("equipo_id", equipoId);

    // Luego, asignamos el equipo a los nuevos seleccionados
    if (empleadoIds.length > 0) {
      const { error } = await this.supabase
        .from("empleados")
        .update({ equipo_id: equipoId })
        .in("id", empleadoIds);
      if (error) throw error;
    }
  }
}
