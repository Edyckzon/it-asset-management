export type MonedaCompra = "USD" | "PEN";

export interface CompraHardware {
  id: string;
  fecha_compra: string;
  proveedor: string;
  tipo_producto: string;
  marca_modelo: string;
  cantidad: number;
  precio_unitario: number;
  moneda?: MonedaCompra;
  tipo_cambio?: number | null;
  numero_documento?: string | null;
  observaciones?: string | null;
  comprobante_path?: string | null;
  comprobante_nombre?: string | null;
  comprobante_tipo?: string | null;
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
  fecha_garantia_fin?: string | null;
  ubicacion?: string | null;
  observaciones?: string | null;
  empleados?: { nombre_completo: string } | null;
  compras_hardware?: CompraHardware | null;
}
