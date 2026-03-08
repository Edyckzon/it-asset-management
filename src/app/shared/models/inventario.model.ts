export interface CompraHardware {
  id: string;
  fecha_compra: string; // ISO date string
  proveedor: string;
  tipo_producto: string;
  marca_modelo: string;
  cantidad: number;
  precio_unitario: number;
}

export interface ActivoTI {
  id: string;
  codigo_inventario: string;
  tipo_activo: string;
  marca_modelo?: string;
  numero_serie?: string;
  nombre_pc?: string;
  direccion_mac?: string;
  direccion_ip?: string;
  estado: string;
  empleado_id?: string | null;
  compra_id?: string | null;

  // 🔥 AGREGA ESTA LÍNEA AQUÍ:
  empleados?: { nombre_completo: string } | null;
}
