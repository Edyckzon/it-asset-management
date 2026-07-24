import { Injectable } from "@angular/core";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { environment } from "../../../environments/environment";

export type SupportTicketPayload = {
  modulo: string;
  categoria: string;
  prioridad: string;
  asunto: string;
  detalle: string;
};

@Injectable({ providedIn: "root" })
export class SupportService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  async createTicket(payload: SupportTicketPayload) {
    const { data, error } = await this.supabase
      .from("soporte_tickets")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getMyTickets() {
    const { data, error } = await this.supabase
      .from("soporte_tickets")
      .select("*")
      .order("fecha_creacion", { ascending: false })
      .limit(20);

    if (error) throw error;
    return data ?? [];
  }
}
