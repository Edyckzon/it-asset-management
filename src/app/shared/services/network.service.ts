import { Injectable, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment'; //

@Injectable({ providedIn: 'root' })
export class NetworkService {
  private supabase: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseKey);

  // Listar usuarios con sus datos de empleado
  async getUsuariosAD() {
    const { data, error } = await this.supabase
      .from('usuarios_ad')
      .select('*, empleados(id, nombre_completo, cargo)')
      .order('fecha_creacion', { ascending: false });
    if (error) throw error;
    return data;
  }

  // Crear nuevo usuario de red
  async crearUsuarioAD(usuario: any) {
    const { data, error } = await this.supabase
      .from('usuarios_ad')
      .insert([usuario]);
    if (error) throw error;
    return data;
  }

  // Actualizar datos técnicos o estado de cuenta
  async actualizarUsuarioAD(id: string, cambios: any) {
    const { error } = await this.supabase
      .from('usuarios_ad')
      .update(cambios)
      .eq('id', id);
    if (error) throw error;
  }

  // Eliminar cuenta del sistema
  async eliminarUsuarioAD(id: string) {
    const { error } = await this.supabase
      .from('usuarios_ad')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
}
