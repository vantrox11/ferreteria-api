/**
 * Catálogo 03 de SUNAT - Tabla 6: Unidades de Medida
 * Normativa: Resolución de Superintendencia N° 097-2012/SUNAT
 * Última actualización: Noviembre 2025
 * Referencia: https://cpe.sunat.gob.pe/node/88
 */

export interface UnidadMedidaSUNAT {
  codigo: string;
  nombre: string;
  permite_decimales: boolean;
  categoria: 'BASICA' | 'MASA' | 'LONGITUD' | 'AREA' | 'VOLUMEN' | 'EMBALAJE' | 'ESPECIAL';
  descripcion?: string;
}

/**
 * Unidades de Medida oficiales según catálogo SUNAT
 * Solo incluye las más relevantes para ferreterías y comercio minorista
 */
export const UNIDADES_MEDIDA_SUNAT: readonly UnidadMedidaSUNAT[] = [
  // === UNIDADES BÁSICAS (Más comunes) ===
  {
    codigo: 'NIU',
    nombre: 'UNIDAD (BIENES)',
    permite_decimales: false,
    categoria: 'BASICA',
    descripcion: 'Unidad estándar para productos unitarios'
  },
  {
    codigo: 'ZZ',
    nombre: 'UNIDAD (SERVICIOS)',
    permite_decimales: false,
    categoria: 'BASICA',
    descripcion: 'Para servicios y conceptos abstractos'
  },

  // === MASA/PESO ===
  {
    codigo: 'KGM',
    nombre: 'KILOGRAMO',
    permite_decimales: true,
    categoria: 'MASA',
    descripcion: 'Peso en kilogramos'
  },
  {
    codigo: 'GRM',
    nombre: 'GRAMO',
    permite_decimales: true,
    categoria: 'MASA',
    descripcion: 'Peso en gramos'
  },
  {
    codigo: 'TNE',
    nombre: 'TONELADA MÉTRICA',
    permite_decimales: true,
    categoria: 'MASA',
    descripcion: '1000 kilogramos'
  },

  // === LONGITUD ===
  {
    codigo: 'MTR',
    nombre: 'METRO',
    permite_decimales: true,
    categoria: 'LONGITUD',
    descripcion: 'Longitud en metros'
  },
  {
    codigo: 'CMT',
    nombre: 'CENTÍMETRO',
    permite_decimales: true,
    categoria: 'LONGITUD',
    descripcion: '0.01 metros'
  },
  {
    codigo: 'MMT',
    nombre: 'MILÍMETRO',
    permite_decimales: true,
    categoria: 'LONGITUD',
    descripcion: '0.001 metros'
  },
  {
    codigo: 'KTM',
    nombre: 'KILÓMETRO',
    permite_decimales: true,
    categoria: 'LONGITUD',
    descripcion: '1000 metros'
  },
  {
    codigo: 'INH',
    nombre: 'PULGADA',
    permite_decimales: true,
    categoria: 'LONGITUD',
    descripcion: '2.54 centímetros'
  },
  {
    codigo: 'FOT',
    nombre: 'PIE',
    permite_decimales: true,
    categoria: 'LONGITUD',
    descripcion: '30.48 centímetros'
  },

  // === ÁREA ===
  {
    codigo: 'MTK',
    nombre: 'METRO CUADRADO',
    permite_decimales: true,
    categoria: 'AREA',
    descripcion: 'Superficie en m²'
  },
  {
    codigo: 'CMK',
    nombre: 'CENTÍMETRO CUADRADO',
    permite_decimales: true,
    categoria: 'AREA',
    descripcion: 'Superficie en cm²'
  },

  // === VOLUMEN ===
  {
    codigo: 'MTQ',
    nombre: 'METRO CÚBICO',
    permite_decimales: true,
    categoria: 'VOLUMEN',
    descripcion: 'Volumen en m³'
  },
  {
    codigo: 'LTR',
    nombre: 'LITRO',
    permite_decimales: true,
    categoria: 'VOLUMEN',
    descripcion: 'Capacidad líquida'
  },
  {
    codigo: 'MLT',
    nombre: 'MILILITRO',
    permite_decimales: true,
    categoria: 'VOLUMEN',
    descripcion: '0.001 litros'
  },
  {
    codigo: 'GLL',
    nombre: 'GALÓN',
    permite_decimales: true,
    categoria: 'VOLUMEN',
    descripcion: '3.785 litros (galón US)'
  },

  // === EMBALAJE/AGRUPACIÓN ===
  {
    codigo: 'BX',
    nombre: 'CAJA',
    permite_decimales: false,
    categoria: 'EMBALAJE',
    descripcion: 'Unidad de empaque'
  },
  {
    codigo: 'PK',
    nombre: 'PAQUETE',
    permite_decimales: false,
    categoria: 'EMBALAJE',
    descripcion: 'Agrupación de unidades'
  },
  {
    codigo: 'DZN',
    nombre: 'DOCENA',
    permite_decimales: false,
    categoria: 'EMBALAJE',
    descripcion: '12 unidades'
  },
  {
    codigo: 'MIL',
    nombre: 'MILLAR',
    permite_decimales: false,
    categoria: 'EMBALAJE',
    descripcion: '1000 unidades'
  },
  {
    codigo: 'PF',
    nombre: 'PALLET',
    permite_decimales: false,
    categoria: 'EMBALAJE',
    descripcion: 'Plataforma de carga'
  },
  {
    codigo: 'BG',
    nombre: 'BOLSA',
    permite_decimales: false,
    categoria: 'EMBALAJE',
    descripcion: 'Empaque tipo bolsa'
  },

  // === UNIDADES ESPECIALES (Ferretería) ===
  {
    codigo: 'SET',
    nombre: 'CONJUNTO/SET',
    permite_decimales: false,
    categoria: 'ESPECIAL',
    descripcion: 'Conjunto de artículos relacionados'
  },
  {
    codigo: 'PR',
    nombre: 'PAR',
    permite_decimales: false,
    categoria: 'ESPECIAL',
    descripcion: 'Dos unidades complementarias'
  },
  {
    codigo: 'BLL',
    nombre: 'BARRIL',
    permite_decimales: true,
    categoria: 'ESPECIAL',
    descripcion: 'Unidad de volumen industrial'
  },
  {
    codigo: 'CAN',
    nombre: 'LATA/ENVASE',
    permite_decimales: false,
    categoria: 'ESPECIAL',
    descripcion: 'Contenedor metálico'
  }
] as const;

/**
 * Obtener unidades básicas recomendadas para nuevos tenants
 * (subset del catálogo completo - las más usadas)
 */
export const UNIDADES_MEDIDA_INICIALES: readonly UnidadMedidaSUNAT[] = [
  { codigo: 'NIU', nombre: 'UNIDAD (BIENES)', permite_decimales: false, categoria: 'BASICA' },
  { codigo: 'KGM', nombre: 'KILOGRAMO', permite_decimales: true, categoria: 'MASA' },
  { codigo: 'GRM', nombre: 'GRAMO', permite_decimales: true, categoria: 'MASA' },
  { codigo: 'MTR', nombre: 'METRO', permite_decimales: true, categoria: 'LONGITUD' },
  { codigo: 'CMT', nombre: 'CENTÍMETRO', permite_decimales: true, categoria: 'LONGITUD' },
  { codigo: 'MTK', nombre: 'METRO CUADRADO', permite_decimales: true, categoria: 'AREA' },
  { codigo: 'MTQ', nombre: 'METRO CÚBICO', permite_decimales: true, categoria: 'VOLUMEN' },
  { codigo: 'LTR', nombre: 'LITRO', permite_decimales: true, categoria: 'VOLUMEN' },
  { codigo: 'MLT', nombre: 'MILILITRO', permite_decimales: true, categoria: 'VOLUMEN' },
  { codigo: 'BX', nombre: 'CAJA', permite_decimales: false, categoria: 'EMBALAJE' },
  { codigo: 'PK', nombre: 'PAQUETE', permite_decimales: false, categoria: 'EMBALAJE' },
  { codigo: 'DZN', nombre: 'DOCENA', permite_decimales: false, categoria: 'EMBALAJE' }
] as const;

/**
 * Validar si un código es válido según SUNAT
 */
export function esCodigoSUNATValido(codigo: string): boolean {
  return UNIDADES_MEDIDA_SUNAT.some(u => u.codigo === codigo.toUpperCase());
}

/**
 * Obtener información de una unidad por código
 */
export function obtenerUnidadPorCodigo(codigo: string): UnidadMedidaSUNAT | undefined {
  return UNIDADES_MEDIDA_SUNAT.find(u => u.codigo === codigo.toUpperCase());
}

/**
 * Obtener unidades por categoría
 */
export function obtenerUnidadesPorCategoria(
  categoria: UnidadMedidaSUNAT['categoria']
): readonly UnidadMedidaSUNAT[] {
  return UNIDADES_MEDIDA_SUNAT.filter(u => u.categoria === categoria);
}
