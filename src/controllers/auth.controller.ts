import { type Request, type Response } from 'express';
import * as tenantModel from '../models/tenant.model';
import * as usuarioModel from '../models/usuario.model';
import { db } from '../config/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { RolUsuario } from '@prisma/client';
import asyncHandler from 'express-async-handler';
import { type RequestWithTenant } from '../middlewares/tenant.middleware';
import { RegisterTenantSchema, LoginSchema, VerifyTenantSchema } from '../dtos/auth.dto';
import { UNIDADES_MEDIDA_SUNAT } from '../config/catalogo-sunat';

/**
 * Registra un nuevo tenant y su usuario administrador
 */
export const registerTenantHandler = asyncHandler(async (req: Request, res: Response) => {
    const { nombre_empresa, subdominio, email, password } = req.body;

    const existingTenant = await tenantModel.findTenantBySubdominio(subdominio);
    if (existingTenant) {
        res.status(409).json({ message: "El subdominio ya está en uso." });
        return;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    
    const result = await db.$transaction(async (tx) => {
        const newTenant = await tenantModel.createTenant(
            { nombre_empresa, subdominio },
            tx
        );
        const newAdmin = await usuarioModel.createUsuario(
            { 
                email, 
                password_hash, 
                rol: RolUsuario.admin, 
                nombre: `Administrador - ${nombre_empresa}`,  // ✅ Asignar nombre descriptivo
                isActive: true 
            },
            newTenant.id,
            tx
        );

        // HITO 1: Poblar UnidadesMedida con códigos oficiales SUNAT (Catálogo 03)
        // Referencia: Resolución de Superintendencia N° 097-2012/SUNAT
        await tx.unidadesMedida.createMany({
            data: UNIDADES_MEDIDA_SUNAT.map(unidad => ({
                codigo: unidad.codigo,
                nombre: unidad.nombre,
                permite_decimales: unidad.permite_decimales,
                tenant_id: newTenant.id
            }))
        });

        return { newTenant, newAdmin };
    });

    // TODO: Implementar envío de email de validación con Resend
    console.log(`TODO: Enviar email de validación a ${email} con Resend.`);
    
    res.status(201).json({
        message: "Tenant registrado exitosamente. Requiere activación manual en desarrollo.",
        tenant: {
            id: result.newTenant.id,
            nombre_empresa: result.newTenant.nombre_empresa,
            subdominio: result.newTenant.subdominio,
            isActive: result.newTenant.isActive
        }
    });
});

/**
 * Autentica un usuario dentro de un tenant específico
 */
export const loginHandler = asyncHandler(async (req: RequestWithTenant, res: Response) => {
    const { email, password } = req.body;
    const tenantId = req.tenantId;

    if (!email || !password || !tenantId) {
        res.status(400).json({ message: "Email, contraseña y subdominio son requeridos." });
        return;
    }

    const usuario = await usuarioModel.findUsuarioByEmailAndTenant(tenantId, email);
    
    if (!usuario || !(await bcrypt.compare(password, usuario.password_hash))) {
        res.status(401).json({ message: "Credenciales inválidas." });
        return;
    }

    // Validación crítica: verificar que el usuario esté activo
    if (!usuario.isActive) {
        res.status(403).json({ message: "Usuario desactivado. Contacta al administrador." });
        return;
    }

    const jwtPayload = {
        sub: usuario.id,
        tid: usuario.tenant_id,
        rol: usuario.rol
    };

    const token = jwt.sign(
        jwtPayload,
        process.env.JWT_SECRET as string,
        { expiresIn: '1d' }
    );

    res.status(200).json({
        token: token,
        user: {
            id: usuario.id,
            email: usuario.email,
            nombre: usuario.nombre,
            rol: usuario.rol,
            tenantId: req.tenantId
        }
    });
});

/**
 * Verificación manual de tenant (DEV) — activa isActive
 * Solo permitido si TENANT_ACTIVATION_MODE=manual
 * Body admite { tenantId } o { subdominio }
 */
export const verifyTenantHandler = asyncHandler(async (req: Request, res: Response) => {
    const mode = (process.env.TENANT_ACTIVATION_MODE || 'manual').toLowerCase();
    if (mode !== 'manual') {
        res.status(403).json({ message: 'Activación por correo habilitada. Usa verificación por email en producción.' });
        return;
    }

    const { tenantId, subdominio } = req.body;

    let tenant: Awaited<ReturnType<typeof tenantModel.findTenantById>> | null = null;
    if (tenantId) {
        tenant = await tenantModel.findTenantById(Number(tenantId));
    } else if (subdominio) {
        tenant = await tenantModel.findTenantBySubdominio(subdominio);
    }

    if (!tenant) {
        res.status(404).json({ message: 'Tenant no encontrado.' });
        return;
    }

    if (tenant.isActive) {
        res.status(200).json({ message: 'Tenant ya estaba activo.', tenantId: tenant.id });
        return;
    }

    const updated = await tenantModel.activateTenantById(tenant.id);
    res.status(200).json({ message: 'Tenant activado manualmente (DEV).', tenantId: updated.id });
});