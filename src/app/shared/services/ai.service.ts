import { Injectable, inject } from "@angular/core";
import Groq from "groq-sdk";
import { InventarioService } from "./inventario.service";
import { RrhhService } from "./rrhh.service";
import { HistorialService } from "./historial.service"; // <-- 1. Importamos el Historial
import { environment } from "../../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class AiService {
  private invSvc = inject(InventarioService);
  private rrhhSvc = inject(RrhhService);
  private historialSvc = inject(HistorialService); // <-- 2. Lo inyectamos

  // 🔥 PEGA TU CLAVE DE GROQ AQUÍ 🔥
  private groq = new Groq({
    apiKey: environment.groqApiKey,
    dangerouslyAllowBrowser: true,
  });

  async preguntar(preguntaUsuario: string): Promise<string> {
    try {
      // 3. Agregamos el historial a la carga de datos
      const [empleados, activos, asignaciones, compras, historial] =
        await Promise.all([
          this.rrhhSvc.getEmpleados(),
          this.invSvc.getActivos(),
          this.invSvc.getAsignacionesActivas(),
          this.invSvc.getCompras(),
          this.historialSvc.getAll(), // Asegúrate de que este método se llame así en tu servicio
        ]);

      // 4. Empaquetamos todo, incluyendo los movimientos
      const datosSistema = {
        EMPLEADOS: empleados.map((e: any) => ({
          nombre: e.nombre_completo,
          cargo: e.cargo,
          estado: e.estado,
        })),
        ACTIVOS_TI: activos.map((a: any) => ({
          codigo: a.codigo_inventario,
          tipo: a.tipo_activo,
          estado: a.estado,
          pc: a.nombre_pc,
          asignado_a: a.empleados?.nombre_completo || "Almacén",
        })),
        ASIGNACIONES: asignaciones.map((asig: any) => ({
          empleado: asig.empleados?.nombre_completo,
          equipo: asig.activos_ti?.codigo_inventario,
          fecha: asig.fecha_asignacion,
        })),
        COMPRAS: compras.map((c: any) => ({
          producto: c.tipo_producto,
          cantidad: c.cantidad,
          fecha: c.fecha_compra,
        })),
        // 🔥 AQUÍ LE PASAMOS LOS MOVIMIENTOS A LA IA 🔥
        HISTORIAL_MOVIMIENTOS: historial.map((h: any) => ({
          modulo: h.modulo,
          accion: h.accion,
          detalle: h.detalle,
          fecha: h.fecha,
        })),
      };

      const chatCompletion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `Eres el Asistente TI experto de OSZ Software. 
            Responde las preguntas del usuario basándote ÚNICAMENTE en el siguiente JSON que contiene toda la base de datos actual de la empresa:
            
            ${JSON.stringify(datosSistema)}

            Reglas estrictas:
            - Sé directo, amable, conciso y responde en español.
            - Usa la información cruzada (Ej: Si preguntan qué equipo tiene X empleado, búscalo en ASIGNACIONES o ACTIVOS_TI. Si preguntan por movimientos, busca en HISTORIAL_MOVIMIENTOS).
            - Si te preguntan algo que no está en el JSON, di honestamente que no tienes esa información.`,
          },
          {
            role: "user",
            content: preguntaUsuario,
          },
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.2,
      });

      return (
        chatCompletion.choices[0]?.message?.content ||
        "Lo siento, me quedé sin palabras."
      );
    } catch (error) {
      console.error("Error al conectar con Groq:", error);
      return "Hubo un error de conexión con mi cerebro artificial. Verifica tu API Key o la consola.";
    }
  }
}
