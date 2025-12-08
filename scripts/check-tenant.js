const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDefaultTenant() {
  try {
    const tenant = await prisma.tenants.findUnique({
      where: { subdominio: 'default' }
    });
    
    if (tenant) {
      console.log('✅ Tenant "default" existe:');
      console.log(JSON.stringify(tenant, null, 2));
    } else {
      console.log('❌ Tenant "default" NO existe en la base de datos');
      console.log('Esto causa el error 400 en el middleware de tenant');
    }
    
    // Mostrar todos los tenants disponibles
    const allTenants = await prisma.tenants.findMany();
    console.log('\n📋 Tenants disponibles:', allTenants.map(t => t.subdominio));
    
  } catch (error) {
    console.error('Error al consultar:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDefaultTenant();
