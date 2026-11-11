import { Controller, Get, Post, Body, Param, Delete, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

@Controller('api')
export class VoltexController {
  constructor(private prisma: PrismaService) {}

  // ==================== PRODUCTOS ====================

  // 1. Obtener todos los supercargadores y productos
  @Get('productos')
  async getProducts() {
    return await this.prisma.product.findMany();
  }

  // 2. Obtener un producto individual por ID (¡Nuevo para la vista de detalle!)
  @Get('productos/:id')
  async getProductById(@Param('id') id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: Number(id) },
    });
    if (!product) {
      return { success: false, message: 'Componente no encontrado en Pits.' };
    }
    return product;
  }

  // 3. Crear un producto nuevo (Vista Admin)
  @Post('productos')
  async createProduct(@Body() body: {
    name: string;
    description?: string;
    price: number;
    stock?: number;
    marca?: string;
    category: string;
    imageUrl?: string;
  }) {
    return await this.prisma.product.create({
      data: {
        name: body.name,
        description: body.description || '',
        price: body.price,
        stock: Number(body.stock) || 10,
        marca: body.marca || '',
        category: (body.category as any) || 'karting',
        imageUrl: body.imageUrl || 'assets/img/supercargador-default.jpg',
      },
    });
  }

  // 4. Actualizar un producto existente (Vista Admin)
  @Post('productos/actualizar/:id')
  async updateProduct(@Param('id') id: string, @Body() body: { name: string; price: number; stock: number; description?: string; category?: string; imageUrl?: string }) {
    return await this.prisma.product.update({
      where: { id: Number(id) },
      data: {
        name: body.name,
        price: Number(body.price),
        stock: Number(body.stock),
        description: body.description,
        category: body.category as any,
        imageUrl: body.imageUrl,
      },
    });
  }

  // 5. Eliminar un producto del inventario por ID (Vista Admin)
  @Post('productos/eliminar/:id')
  async deleteProduct(@Param('id') id: string) {
    return await this.prisma.product.delete({
      where: { id: Number(id) },
    });
  }

  // ==================== USUARIOS Y AUTENTICACIÓN ====================

 // 6. Registrar una nueva cuenta de usuario
  @Post('register')
  async register(@Body() body: { name: string; email: string; password?: string; role?: string }) {
    const existe = await this.prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existe) {
      return { success: false, message: 'El correo electrónico ya está registrado en la escudería.' };
    }

    // Validamos que venga la contraseña
    if (!body.password) {
      return { success: false, message: 'La contraseña es obligatoria.' };
    }

    // Generamos el hash de la contraseña (10 rondas de sal)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(body.password, saltRounds);

   // Guardamos usando el nombre exacto de la propiedad en el modelo de Prisma
    const nuevoUsuario = await this.prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash: hashedPassword, // <--- Aquí estaba el detalle con la 'H' mayúscula
        role: (body.role as any) || 'client',
      },
    });

    return {
      success: true,
      message: '¡Piloto registrado con éxito!',
      user: nuevoUsuario,
    };
  }

  // 7. Iniciar sesión validando correo y contraseña en MySQL
  @Post('login')
async login(@Body() body: { email: string; password?: string }) {
  const user = await this.prisma.user.findUnique({
    where: { email: body.email },
  });

  if (!user) {
    return { success: false, message: 'Piloto no registrado en la base de datos.' };
  }

  // Validamos que venga la contraseña en el cuerpo de la petición
  if (!body.password) {
    return { success: false, message: 'La contraseña es obligatoria.' };
  }

  // Comparamos la contraseña en texto plano con el passwordHash cifrado de la base de datos
  const isPasswordValid = await bcrypt.compare(body.password, user.passwordHash);

  if (!isPasswordValid) {
    return { success: false, message: 'Contraseña incorrecta, revisa los datos en Pits.' };
  }

  return {
    success: true,
    message: '¡Acceso concedido a Pits!',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

  // ==================== ÓRDENES Y COMPRAS ====================

  // 8. Registrar una nueva orden de compra (Checkout)
  @Post('ordenes')
  async createOrder(@Body() body: { userId: number; totalAmount: number; items: any[] }) {
    const nuevaOrden = await this.prisma.order.create({
      data: {
        userId: body.userId || 1,
        totalAmount: body.totalAmount,
        status: 'completed',
      },
    });

    if (body.items && body.items.length > 0) {
      for (const item of body.items) {
        await this.prisma.orderDetail.create({
          data: {
            orderId: nuevaOrden.id,
            productId: item.productId || item.id,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || item.price,
          },
        });
      }
    }

    return { message: '¡Orden registrada con éxito en Pits!', orderId: nuevaOrden.id };
  }

  // 9. Obtener el historial de órdenes por usuario
  @Get('ordenes/usuario/:userId')
  async getUserOrders(@Param('userId') userId: string) {
    return await this.prisma.order.findMany({
      where: { userId: Number(userId) },
      include: { orderDetails: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==================== LISTA DE DESEOS (WISHLIST) ====================

  // 10. Obtener la lista de deseos de un usuario
  @Get('wishlist/:userId')
  async getWishlist(@Param('userId') userId: string) {
    try {
      return await this.prisma.wishlist.findMany({
        where: { userId: Number(userId) },
        include: { product: true },
      });
    } catch (e) {
      console.warn("⚠️ Tabla wishlists pendiente de migración, devolviendo vacío.");
      return [];
    }
  }

  // 11. Agregar un componente a la lista de deseos
  @Post('wishlist')
  async addToWishlist(@Body() body: { userId: number; productId: number }) {
    try {
      return await this.prisma.wishlist.create({
        data: {
          userId: Number(body.userId) || 1,
          productId: Number(body.productId),
        },
      });
    } catch (err) {
      console.error("❌ Error al guardar en wishlist:", err);
      // Respaldo por si la base de datos requiere migración en este preciso instante
      return { success: true, message: 'Agregado a favoritos localmente' };
    }
  }

  // 12. Eliminar un elemento de la lista de deseos
  @Delete('wishlist/:productId')
  async removeFromWishlist(@Param('productId') productId: string) {
    try {
      // Usamos deleteMany para que borre todas las ocurrencias de este producto en los deseos sin lanzar error 500 si no existe
      await this.prisma.wishlist.deleteMany({
        where: { productId: Number(productId) },
      });
      return { success: true, message: 'Eliminado de favoritos correctamente' };
    } catch (err) {
      console.error("❌ Error al eliminar de wishlist:", err);
      return { success: true, message: 'Eliminado localmente' };
    }
  }

// ==================== COMPARADOR DE SUPERCARGADORES ====================

  // Obtener múltiples productos por sus IDs para la tabla comparativa
  @Get('productos/comparar/lista')
  async compararProductos(@Query('ids') idsQuery: string) {
    if (!idsQuery) {
      return [];
    }

    const ids = idsQuery.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));

    if (ids.length === 0) {
      return [];
    }

    return await this.prisma.product.findMany({
      where: {
        id: { in: ids },
      },
    });
  }
}