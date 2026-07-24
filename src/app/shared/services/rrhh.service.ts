import { Injectable } from "@angular/core";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { environment } from "../../../environments/environment";
import { Area, Credencial } from "../models/rrhh.model";

@Injectable({ providedIn: "root" })
export class RrhhService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
    );
  }

  // Obtiene todas las áreas
  async getAreas(): Promise<Area[]> {
    const { data, error } = await this.supabase
      .from("areas")
      .select("*")
      .order("nombre", { ascending: true });
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
      .select("*, areas(nombre)")
      .order("nombre_completo", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async getEmpleadosActivos(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from("empleados")
      .select("*, areas(nombre)")
      .eq("estado", true)
      .order("nombre_completo", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async getBloqueosParaInactivarEmpleado(empleadoId: string): Promise<string[]> {
    const [activosRes, adRes, credRes, liderRes, equipoRes] = await Promise.all([
      this.supabase
        .from("activos_ti")
        .select("id, codigo_inventario, tipo_activo, estado")
        .eq("empleado_id", empleadoId)
        .neq("estado", "Baja"),
      this.supabase
        .from("usuarios_ad")
        .select("id, username_ad, estado_cuenta")
        .eq("empleado_id", empleadoId)
        .eq("estado_cuenta", true),
      this.supabase
        .from("credenciales")
        .select("id, sistema, usuario")
        .eq("empleado_id", empleadoId),
      this.supabase
        .from("equipos")
        .select("id, nombre_equipo")
        .eq("lider_id", empleadoId),
      this.supabase
        .from("empleados")
        .select("equipo_id, equipos(nombre_equipo)")
        .eq("id", empleadoId)
        .not("equipo_id", "is", null)
        .maybeSingle(),
    ]);

    const error = activosRes.error || adRes.error || credRes.error || liderRes.error || equipoRes.error;
    if (error) throw error;

    const bloqueos: string[] = [];
    const activos = activosRes.data ?? [];
    const usuariosAd = adRes.data ?? [];
    const credenciales = credRes.data ?? [];
    const liderEquipos = liderRes.data ?? [];
    const equipoActual = equipoRes.data as any;

    if (activos.length) {
      bloqueos.push(
        `Tiene ${activos.length} activo(s) asignado(s): ${activos
          .map((a) => a.codigo_inventario || a.tipo_activo)
          .slice(0, 3)
          .join(", ")}. Primero registra devolución o baja del activo.`,
      );
    }

    if (usuariosAd.length) {
      bloqueos.push(
        `Tiene cuenta AD activa: ${usuariosAd
          .map((u) => u.username_ad)
          .slice(0, 3)
          .join(", ")}. Primero bloquea/desactiva la cuenta.`,
      );
    }

    if (credenciales.length) {
      bloqueos.push(
        `Tiene ${credenciales.length} credencial(es) registrada(s). Primero elimina, reasigna o deja observación de cierre.`,
      );
    }

    if (liderEquipos.length) {
      bloqueos.push(
        `Es líder de equipo: ${liderEquipos
          .map((e) => e.nombre_equipo)
          .join(", ")}. Primero cambia el líder.`,
      );
    }

    if (equipoActual?.equipo_id) {
      bloqueos.push(
        `Pertenece a un equipo activo. Primero retíralo del equipo o reasigna integrantes.`,
      );
    }

    return bloqueos;
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

  // Actualiza cualquier campo del empleado (Nombre, Cargo, Área, Estado)
  async updateEmpleado(id: string, cambios: any): Promise<any> {
    const { data, error } = await this.supabase
      .from("empleados")
      .update(cambios)
      .eq("id", id)
      .select("*, areas(nombre)")
      .single();

    if (error) throw error;
    return data;
  }

  // Credenciales (accesos)
  async getCredenciales(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from("credenciales")
      .select("*, empleados(nombre_completo)")
      .order("sistema", { ascending: true });
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

  async updateCredencial(
    id: string,
    cambios: Partial<Credencial>,
  ): Promise<any> {
    const { data, error } = await this.supabase
      .from("credenciales")
      .update(cambios)
      .eq("id", id)
      .select("*, empleados(nombre_completo)")
      .single();
    if (error) throw error;
    return data;
  }

  // Elimina una credencial por id
  async deleteCredencial(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("credenciales")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }

  // Elimina un empleado por id
  async deleteEmpleado(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("empleados")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }
}
