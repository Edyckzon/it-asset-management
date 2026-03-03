import { Injectable } from "@angular/core";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { environment } from "../../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    // Aquí inicializamos la conexión "mágica" con tu base de datos
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  // Método que usaremos para el Login
  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      throw error;
    }
    return data;
  }

  // Devuelve la sesión actual (o null si no existe)
  async getSession(): Promise<any | null> {
    const res = await this.supabase.auth.getSession();
    return res?.data?.session ?? null;
  }

  // Cierra la sesión del usuario
  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  // Devuelve el usuario actual (o null si no hay)
  async getUser(): Promise<any | null> {
    try {
      const { data } = await this.supabase.auth.getUser();
      return data?.user ?? null;
    } catch (err) {
      console.error('Error getting user from Supabase:', err);
      return null;
    }
  }
}
