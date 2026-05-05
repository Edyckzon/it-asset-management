import { Injectable, inject } from "@angular/core";
import Groq from "groq-sdk";
import { InventarioService } from "./inventario.service";
import { RrhhService } from "./rrhh.service";
import { HistorialService } from "./historial.service";
import { EquipoService } from "./equipo.service";
import { NetworkService } from "./network.service"; // 🔥 1. Importamos la Red
import { environment } from "../../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class AiService {
  private invSvc = inject(InventarioService);
  private rrhhSvc = inject(RrhhService);
  private historialSvc = inject(HistorialService);
  private equiposSvc = inject(EquipoService);
  private netSvc = inject(NetworkService); // 🔥 2. Inyectamos el servicio de Red

  private groq = new Groq({
    apiKey: environment.groqApiKey,
    dangerouslyAllowBrowser: true,
  });

  async preguntar(preguntaUsuario: string): Promise<string> {
    try {
      // 🔥 3. Añadimos la red al cargador masivo
      const [empleados, areas, equipos, activos, asignaciones, compras, credenciales, historial, usuariosAD] =
        await Promise.all([
          this.rrhhSvc.getEmpleados(),
          this.rrhhSvc.getAreas(),
          this.equiposSvc.getEquipos(),
          this.invSvc.getActivos(),
          this.invSvc.getAsignacionesActivas(),
          this.invSvc.getCompras(),
          this.rrhhSvc.getCredenciales(),
          this.historialSvc.getAll(),
          this.netSvc.getUsuariosAD(), // <-- Traemos las cuentas de AD
        ]);

      // 4. Empaquetamos todo para el cerebro de la IA
      const datosSistema = {
        ORGANIZACION: {
          AREAS_CREADAS: areas.map((a: any) => a.nombre),
          SQUADS_ACTIVOS: equipos.map((eq: any) => ({
            nombre: eq.nombre_equipo,
            lider: empleados.find(e => e.id === eq.lider_id)?.nombre_completo || 'Sin Líder'
          }))
        },
        EMPLEADOS: empleados.map((e: any) => ({
          nombre: e.nombre_completo,
          cargo: e.cargo,
          estado: e.estado ? 'Activo' : 'Inactivo',
          area: e.areas?.nombre || 'Sin Área',
          squad: e.equipos?.nombre_equipo || 'Sin Squad',
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
          precio_unidad: c.precio_unitario,
          fecha: c.fecha_compra,
        })),
        CREDENCIALES: credenciales.map((cred: any) => ({
          empleado: cred.empleados?.nombre_completo,
          sistema: cred.sistema,
          acceso: cred.tipo_acceso
        })),
        // 🔥 5. Le enseñamos a la IA sobre el Active Directory 🔥
        ACTIVE_DIRECTORY: usuariosAD?.map((ad: any) => ({
          empleado: ad.empleados?.nombre_completo || 'Desconocido',
          username: ad.username_ad,
          grupo: ad.grupo_ad || '-',
          ou: ad.organizational_unit || '-',
          estado: ad.estado_cuenta ? 'Activo' : 'Bloqueado'
          // REGLA DE ORO: ¡password_ad NO SE ENVÍA AQUÍ!
        })) || [],
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
            content: `Eres el Asistente TI y HR experto del sistema "A&M Smart Hub". 
            Responde las preguntas del usuario basándote ÚNICAMENTE en el siguiente JSON que contiene toda la base de datos actual de la empresa:
            
            ${JSON.stringify(datosSistema)}

            Reglas estrictas:
            - Sé directo, amable, profesional y responde en español.
            - Puedes cruzar información libremente (Ej: "Juan Pérez del área de Finanzas tiene asignada una Laptop Dell y cuenta de Active Directory activa en el grupo Sistemas").
            - Si te preguntan por dinero, puedes calcular inversiones multiplicando precio por cantidad.
            - Si te preguntan por accesos de red o VPN, busca en la sección ACTIVE_DIRECTORY.
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
        "Lo siento, hubo un cruce de cables y no pude generar la respuesta."
      );
    } catch (error) {
      console.error("Error al conectar con Groq:", error);
      throw error; 
    }
  }
}