export interface Area {
  id: string;
  nombre: string;
}

export interface Empleado {
  id: string;
  area_id: string;
  nombre_completo: string;
  cargo: string;
  estado: boolean;
  fecha_creacion: string;
}

export interface Credencial {
  id: string;
  empleado_id: string;
  tipo_acceso: string;
  sistema: string;
  usuario: string;
  contrasena: string;
  url_acceso?: string;
  notas?: string;
}
