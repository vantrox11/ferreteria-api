import { type Request, type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { db } from '../config/db';
import { Prisma } from '@prisma/client';
import type { CreatePedidoPublicoDTO, CatalogoPublicoQueryDTO } from '../dtos/public.dto';

/**
 * GET /api/public/catalogo
 * Endpoint público para obtener productos disponibles (sin autenticación)
 * Solo expone datos seguros para el catálogo web
 */
export const getCatalogoPublicoHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant no identificado' });
      return;
    }

    const query = req.query as CatalogoPublicoQueryDTO;
    const search = query.q?.trim();
    const categoriaId = query.categoria_id ? parseInt(query.categoria_id) : undefined;
    const marcaId = query.marca_id ? parseInt(query.marca_id) : undefined;
    const limit = Math.min(parseInt(query.limit || '50'), 100); // Max 100 productos

    // Construir filtros
    const whereClause: Prisma.ProductosWhereInput = {
      tenant_id: tenantId,
      isActive: true, // Solo productos activos
      ...(search && {
        OR: [
          { nombre: { contains: search } },
          { sku: { contains: search } },
        ],
      }),
      ...(categoriaId && { categoria_id: categoriaId }),
      ...(marcaId && { marca_id: marcaId }),
    };

    const productos = await db.productos.findMany({
      where: whereClause,
      take: limit,
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        precio_base: true, // Precio sin IGV
        afectacion_igv: true, // GRAVADO, EXONERADO, INAFECTO
        stock: true,
        imagen_url: true,
        sku: true,
        marca: {
          select: { nombre: true },
        },
        categoria: {
          select: { nombre: true },
        },
      },
    });

    // Transformar respuesta - NO exponer datos sensibles
    const catalogo = productos.map((p) => {
      const precioBase = Number(p.precio_base);
      // Calcular precio de venta según afectación IGV
      const precioVenta = p.afectacion_igv === 'GRAVADO' 
        ? precioBase * 1.18  // Agregar 18% IGV
        : precioBase;        // Sin IGV (EXONERADO o INAFECTO)

      return {
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precio_venta: Number(precioVenta.toFixed(2)),
        disponible: Number(p.stock) > 0,
        stock: Number(p.stock),
        imagen_url: p.imagen_url,
        marca: p.marca?.nombre || null,
        categoria: p.categoria?.nombre || null,
        sku: p.sku,
      };
    });

    res.status(200).json({ data: catalogo });
  }
);

/**
 * POST /api/public/checkout
 * Endpoint público para crear pedido desde la tienda web (sin autenticación)
 * 
 * Lógica:
 * 1. Buscar cliente por DNI o Email
 * 2. Si existe: actualizar datos y usar ese ID
 * 3. Si NO existe: crear nuevo cliente
 * 4. Crear pedido con estado "pendiente"
 * 5. Validar stock disponible
 */
export const createCheckoutPublicoHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant no identificado' });
      return;
    }

    const body = req.body as CreatePedidoPublicoDTO;
    const { cliente: datosCliente, tipo_recojo, carrito } = body;

    try {
      // ============= PASO 1: Gestionar cliente (Buscar o Crear) =============
      let clienteId: number;

      // Buscar cliente existente por documento_identidad o email
      const clienteExistente = await db.clientes.findFirst({
        where: {
          tenant_id: tenantId,
          OR: [
            { documento_identidad: datosCliente.documento_identidad },
            { email: datosCliente.email },
          ],
        },
        select: { id: true },
      });

      if (clienteExistente) {
        // Cliente existe: actualizar datos
        await db.clientes.update({
          where: { id: clienteExistente.id },
          data: {
            nombre: datosCliente.nombre,
            documento_identidad: datosCliente.documento_identidad,
            email: datosCliente.email,
            telefono: datosCliente.telefono,
            direccion: datosCliente.direccion || null,
          },
        });
        clienteId = clienteExistente.id;
      } else {
        // Cliente NO existe: crear nuevo
        const nuevoCliente = await db.clientes.create({
          data: {
            nombre: datosCliente.nombre,
            documento_identidad: datosCliente.documento_identidad,
            email: datosCliente.email,
            telefono: datosCliente.telefono,
            direccion: datosCliente.direccion || null,
            tenant_id: tenantId,
            isActive: true,
          },
        });
        clienteId = nuevoCliente.id;
      }

      // ============= PASO 2: Validar stock de productos =============
      for (const item of carrito) {
        const producto = await db.productos.findFirst({
          where: {
            id: item.producto_id,
            tenant_id: tenantId,
            isActive: true,
          },
          select: { stock: true, nombre: true },
        });

        if (!producto) {
          res.status(404).json({
            message: `Producto con ID ${item.producto_id} no encontrado o no disponible`,
          });
          return;
        }

        if (Number(producto.stock) < Number(item.cantidad)) {
          res.status(409).json({
            message: `Stock insuficiente para el producto "${producto.nombre}". Stock disponible: ${producto.stock}`,
          });
          return;
        }
      }

      // ============= PASO 3: Crear pedido en transacción =============
      const pedido = await db.$transaction(async (tx) => {
        // Crear pedido
        const nuevoPedido = await tx.pedidos.create({
          data: {
            tenant_id: tenantId,
            cliente_id: clienteId,
            estado: 'pendiente',
            tipo_recojo: tipo_recojo,
          },
        });

        // Crear detalles del pedido
        const detallesData = carrito.map((item) => ({
          pedido_id: nuevoPedido.id,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          tenant_id: tenantId,
        }));

        await tx.pedidoDetalles.createMany({
          data: detallesData,
        });

        return nuevoPedido;
      });

      // ============= PASO 4: Responder con éxito =============
      res.status(201).json({
        pedido_id: pedido.id,
        estado: 'pendiente',
        mensaje: 'Pedido registrado exitosamente. Recibirá un correo de confirmación cuando procesemos su solicitud.',
      });

      // TODO: Enviar email de confirmación con Resend
      // await sendEmailConfirmacionPedido(datosCliente.email, pedido.id);

    } catch (error: any) {
      console.error('❌ Error al crear pedido público:', error);
      
      if (error?.code === 'P2002') {
        res.status(409).json({ message: 'Error de duplicación en base de datos' });
        return;
      }

      res.status(500).json({
        message: 'Error al procesar el pedido. Por favor intente nuevamente.',
      });
    }
  }
);
