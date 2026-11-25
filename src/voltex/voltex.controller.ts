import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  NotFoundException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Request } from 'express';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

const manualsUploadDir = join(process.cwd(), 'uploads', 'manuals');
if (!existsSync(manualsUploadDir)) {
  mkdirSync(manualsUploadDir, { recursive: true });
}

@Controller('api')
export class VoltexController {
  constructor(private prisma: PrismaService) { }

  // ==================== PRODUCTOS ====================

  // 1. Obtener todos los supercargadores y productos
  @Get('productos')
  async getProducts() {
    return await this.prisma.product.findMany({
      orderBy: { id: 'desc' },
    });
  }

  // 2. Obtener un producto individual por ID
  @Get('productos/:id')
  async getProductById(@Param('id') id: string) {
    const numericId = Number(id);
    if (Number.isNaN(numericId)) {
      return { success: false, message: 'ID de componente no válido.' };
    }

    const product = await this.prisma.product.findUnique({
      where: { id: numericId },
    });

    if (!product) {
      return { success: false, message: 'Componente no encontrado en Pits.' };
    }

    return product;
  }

  // 3. Crear un producto nuevo (Vista Admin)
  @Post('productos')
  async createProduct(@Body() body: any) {
    const precioNumerico = Number(body.price);
    const stockNumerico =
      body.stock !== undefined && body.stock !== null && `${body.stock}` !== ''
        ? Number(body.stock)
        : 10;

    return await this.prisma.product.create({
      data: {
        name: (body.name || '').trim(),
        sku: body.sku?.trim() || null,
        description: body.description ?? '',
        incluye_caja: body.incluye_caja ?? null,
        notas_instalacion: body.notas_instalacion ?? null,
        price: Number.isNaN(precioNumerico) ? 0 : precioNumerico,
        stock: Number.isNaN(stockNumerico) ? 10 : stockNumerico,
        disponibilidad: body.disponibilidad ?? 'En Stock MX',
        tiempo_entrega: body.tiempo_entrega ?? '2-4 dias habiles',
        marca: body.marca ?? '',
        tipo_supercargador: body.tipo_supercargador ?? null,
        nivel_kit: body.nivel_kit ?? null,
        plataforma_motor: body.plataforma_motor ?? null,
        rango_anio: body.rango_anio ?? null,
        potencia_max: body.potencia_max ?? null,
        boost_base: body.boost_base ?? null,
        enfriamiento: body.enfriamiento ?? null,
        category: (body.category || 'Supercargadores').trim(),
        imageUrl: body.imageUrl?.trim() || 'assets/img/supercargador-default.jpg',
      },
    });
  }

  // 4. Actualizar un producto existente (Vista Admin)
  @Post('productos/actualizar/:id')
  async updateProduct(@Param('id') id: string, @Body() body: any) {
    const numericId = Number(id);
    const actual = await this.prisma.product.findUnique({
      where: { id: numericId },
    });

    if (!actual) {
      return { success: false, message: 'Componente no encontrado en Pits.' };
    }

    const precioFinal =
      body.price !== undefined && body.price !== null && `${body.price}` !== ''
        ? Number(body.price)
        : Number(actual.price);

    const stockFinal =
      body.stock !== undefined && body.stock !== null && `${body.stock}` !== ''
        ? Number(body.stock)
        : actual.stock;

    return await this.prisma.product.update({
      where: { id: numericId },
      data: {
        name: body.name?.trim() || actual.name,
        sku: body.sku !== undefined ? body.sku : actual.sku,
        description: body.description !== undefined ? body.description : actual.description,
        incluye_caja: body.incluye_caja !== undefined ? body.incluye_caja : actual.incluye_caja,
        notas_instalacion:
          body.notas_instalacion !== undefined ? body.notas_instalacion : actual.notas_instalacion,
        price: Number.isNaN(precioFinal) ? Number(actual.price) : precioFinal,
        stock: Number.isNaN(stockFinal) ? actual.stock : stockFinal,
        disponibilidad:
          body.disponibilidad !== undefined ? body.disponibilidad : actual.disponibilidad,
        tiempo_entrega:
          body.tiempo_entrega !== undefined ? body.tiempo_entrega : actual.tiempo_entrega,
        marca: body.marca !== undefined ? body.marca : actual.marca,
        tipo_supercargador:
          body.tipo_supercargador !== undefined
            ? body.tipo_supercargador
            : actual.tipo_supercargador,
        nivel_kit: body.nivel_kit !== undefined ? body.nivel_kit : actual.nivel_kit,
        plataforma_motor:
          body.plataforma_motor !== undefined ? body.plataforma_motor : actual.plataforma_motor,
        rango_anio: body.rango_anio !== undefined ? body.rango_anio : actual.rango_anio,
        potencia_max: body.potencia_max !== undefined ? body.potencia_max : actual.potencia_max,
        boost_base: body.boost_base !== undefined ? body.boost_base : actual.boost_base,
        enfriamiento: body.enfriamiento !== undefined ? body.enfriamiento : actual.enfriamiento,
        category: body.category ? body.category.trim() : actual.category,
        imageUrl: body.imageUrl?.trim() || actual.imageUrl,
      },
    });
  }

  // 5. Eliminar un producto del inventario por ID (Vista Admin)
  @Post('productos/eliminar/:id')
  async deleteProduct(@Param('id') id: string) {
    const numericId = Number(id);
    return await this.prisma.product.delete({
      where: { id: numericId },
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

    if (!body.password) {
      return { success: false, message: 'La contraseña es obligatoria.' };
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(body.password, saltRounds);

    const nuevoUsuario = await this.prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash: hashedPassword,
        role: (body.role as any) || 'client',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
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

    if (!body.password) {
      return { success: false, message: 'La contraseña es obligatoria.' };
    }

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
        avatarUrl: user.avatarUrl || 'assets/avatars/piloto-1.png',
      },
    };
  }

  // 7b. Actualizar perfil, avatar predeterminado y/o contraseña del piloto
  @Post('usuarios/actualizar/:id')
  async updateProfile(
    @Param('id') id: string,
    @Body() body: { name?: string; email?: string; password?: string; avatarUrl?: string },
  ) {
    const numericId = Number(id);
    if (Number.isNaN(numericId) || numericId <= 0) {
      return { success: false, message: 'ID de piloto no válido.' };
    }

    const actual = await this.prisma.user.findUnique({
      where: { id: numericId },
    });

    if (!actual) {
      return { success: false, message: 'Piloto no encontrado en la base de datos.' };
    }

    const emailLimpio = body.email?.trim() || actual.email;
    if (emailLimpio !== actual.email) {
      const correoOcupado = await this.prisma.user.findUnique({
        where: { email: emailLimpio },
      });
      if (correoOcupado) {
        return {
          success: false,
          message: 'Ese correo electrónico ya está en uso por otra cuenta.',
        };
      }
    }

    let avatarFinal = actual.avatarUrl || 'assets/avatars/piloto-1.png';
    if (body.avatarUrl && body.avatarUrl.trim().length > 0) {
      const avatarLimpio = body.avatarUrl.trim();
      const avatarValido = await this.prisma.avatar.findFirst({
        where: {
          imageUrl: avatarLimpio,
          activo: true,
        },
      });

      if (!avatarValido) {
        return {
          success: false,
          message: 'El avatar seleccionado no pertenece al catálogo predeterminado.',
        };
      }

      avatarFinal = avatarValido.imageUrl;
    }

    const dataToUpdate: any = {
      name: body.name?.trim() || actual.name,
      email: emailLimpio,
      avatarUrl: avatarFinal,
    };

    if (body.password && body.password.trim().length > 0) {
      const passLimpia = body.password.trim();
      if (passLimpia.length < 8 || passLimpia.length > 15) {
        return {
          success: false,
          message: 'La contraseña debe tener entre 8 y 15 caracteres.',
        };
      }
      dataToUpdate.passwordHash = await bcrypt.hash(passLimpia, 10);
    }

    const usuarioActualizado = await this.prisma.user.update({
      where: { id: numericId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
    });

    return {
      success: true,
      message: '¡Perfil actualizado con éxito en Pits!',
      user: usuarioActualizado,
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
      console.warn('⚠️ Tabla wishlists pendiente de migración, devolviendo vacío.');
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
      console.error('❌ Error al guardar en wishlist:', err);
      return { success: true, message: 'Agregado a favoritos localmente' };
    }
  }

  // 12. Eliminar un elemento de la lista de deseos
  @Delete('wishlist/:productId')
  async removeFromWishlist(@Param('productId') productId: string) {
    try {
      await this.prisma.wishlist.deleteMany({
        where: { productId: Number(productId) },
      });
      return { success: true, message: 'Eliminado de favoritos correctamente' };
    } catch (err) {
      console.error('❌ Error al eliminar de wishlist:', err);
      return { success: true, message: 'Eliminado localmente' };
    }
  }

  // ==================== COMPARADOR DE SUPERCARGADORES ====================

  @Get('productos/comparar/lista')
  async compararProductos(@Query('ids') idsQuery: string) {
    if (!idsQuery) {
      return [];
    }

    const ids = idsQuery.split(',').map((id) => Number(id.trim())).filter((id) => !isNaN(id));

    if (ids.length === 0) {
      return [];
    }

    return await this.prisma.product.findMany({
      where: {
        id: { in: ids },
      },
    });
  }

  // ==================== NOTIFICACIONES ====================

  @Get('notifications')
  async getNotifications(@Query('todas') todasParam?: string) {
    const todas = await this.prisma.notification.findMany({
      orderBy: { id: 'desc' },
    });

    if (todasParam === 'true') {
      return todas;
    }

    return todas.filter((n) =>
      this.haLlegadoHoraNotificacion(n.horaProgramada),
    );
  }

  @Post('notifications')
  async createNotification(
    @Body()
    body: {
      titulo: string;
      mensaje: string;
      horaProgramada?: string;
      tipo?: string;
    },
  ) {
    const titulo = (body.titulo || '').trim();
    const mensaje = (body.mensaje || '').trim();

    if (!titulo || !mensaje) {
      return {
        success: false,
        message: 'El título y el mensaje de la notificación son obligatorios.',
      };
    }

    return await this.prisma.notification.create({
      data: {
        titulo,
        mensaje,
        horaProgramada: (body.horaProgramada || 'Ahora').trim(),
        tipo: (body.tipo || 'push').trim(),
        leida: false,
      },
    });
  }

  @Post('notifications/editar/:id')
  async updateNotification(
    @Param('id') id: string,
    @Body()
    body: {
      titulo?: string;
      mensaje?: string;
      horaProgramada?: string;
      tipo?: string;
    },
  ) {
    const numericId = Number(id);
    if (Number.isNaN(numericId)) {
      return { success: false, message: 'ID de notificación no válido.' };
    }

    const existente = await this.prisma.notification.findUnique({
      where: { id: numericId },
    });

    if (!existente) {
      return { success: false, message: 'Notificación no encontrada.' };
    }

    const data: {
      titulo?: string;
      mensaje?: string;
      horaProgramada?: string;
      tipo?: string;
    } = {};

    if (typeof body.titulo === 'string' && body.titulo.trim()) {
      data.titulo = body.titulo.trim();
    }
    if (typeof body.mensaje === 'string' && body.mensaje.trim()) {
      data.mensaje = body.mensaje.trim();
    }
    if (typeof body.horaProgramada === 'string' && body.horaProgramada.trim()) {
      data.horaProgramada = body.horaProgramada.trim();
    }
    if (typeof body.tipo === 'string' && body.tipo.trim()) {
      data.tipo = body.tipo.trim();
    }

    return await this.prisma.notification.update({
      where: { id: numericId },
      data,
    });
  }

  @Post('notifications/leer/:id')
  async markNotificationAsRead(@Param('id') id: string) {
    const numericId = Number(id);
    if (Number.isNaN(numericId)) {
      return { success: false, message: 'ID de notificación no válido.' };
    }

    return await this.prisma.notification.update({
      where: { id: numericId },
      data: { leida: true },
    });
  }

  @Post('notifications/eliminar/:id')
  async deleteNotification(@Param('id') id: string) {
    const numericId = Number(id);
    if (Number.isNaN(numericId)) {
      return { success: false, message: 'ID de notificación no válido.' };
    }

    return await this.prisma.notification.delete({
      where: { id: numericId },
    });
  }

  private haLlegadoHoraNotificacion(horaProgramada?: string | null): boolean {
    if (!horaProgramada) return true;

    const limpio = String(horaProgramada).trim().toLowerCase();
    if (!limpio || limpio === 'ahora' || limpio === 'reciente' || limpio === 'inmediata') {
      return true;
    }

    const partes = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Mexico_City',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date());

    const horasActuales = Number(partes.find((p) => p.type === 'hour')?.value || '0');
    const minutosActuales = Number(partes.find((p) => p.type === 'minute')?.value || '0');
    const segundosActuales = Number(partes.find((p) => p.type === 'second')?.value || '0');
    const totalSegundosActuales =
      horasActuales * 3600 + minutosActuales * 60 + segundosActuales;

    const match24h = limpio.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match24h) {
      const horas = Number(match24h[1]);
      const minutos = Number(match24h[2]);
      const segundos = match24h[3] ? Number(match24h[3]) : 0;

      if (horas >= 0 && horas <= 23 && minutos >= 0 && minutos <= 59) {
        const totalSegundosObjetivo = horas * 3600 + minutos * 60 + segundos;
        return totalSegundosObjetivo <= totalSegundosActuales;
      }
    }

    const match12h = limpio.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
    if (match12h) {
      let horas = Number(match12h[1]);
      const minutos = Number(match12h[2]);
      const periodo = match12h[3];

      if (periodo === 'pm' && horas < 12) horas += 12;
      if (periodo === 'am' && horas === 12) horas = 0;

      if (horas >= 0 && horas <= 23 && minutos >= 0 && minutos <= 59) {
        const totalSegundosObjetivo = horas * 3600 + minutos * 60;
        return totalSegundosObjetivo <= totalSegundosActuales;
      }
    }

    return true;
  }

  // ==================== AVATARES PREDETERMINADOS ====================

  @Get('avatars')
  async getAvatars() {
    return await this.prisma.avatar.findMany({
      where: { activo: true },
      orderBy: { id: 'asc' },
    });
  }

  // ==================== MANUALES DE PRODUCTO (QR) ====================

  // Listar todos los manuales vinculados con datos del producto
  @Get('manuals')
  async listarManuales() {
    return this.prisma.productManual.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            marca: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  // Obtener el manual por ID de producto (cuando el usuario escanea el QR)
  @Get('manuals/product/:productId')
  async obtenerManualPorProducto(
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    const manual = await this.prisma.productManual.findUnique({
      where: { productId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            marca: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!manual) {
      throw new NotFoundException(
        `No hay un manual registrado para el producto #${productId}`,
      );
    }

    return manual;
  }

  // Subir archivo PDF desde la laptop y vincularlo al ID del producto
  @Post('manuals/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, manualsUploadDir),
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const esPdf =
          file.mimetype === 'application/pdf' ||
          file.originalname.toLowerCase().endsWith('.pdf');
        if (!esPdf) {
          return cb(new BadRequestException('Solo se permiten archivos PDF.'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  async subirManualPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { productId: string; title: string; notes?: string },
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('Debes seleccionar un archivo PDF.');
    }

    const productId = Number(body.productId);
    const title = body.title?.trim();

    if (!productId || Number.isNaN(productId)) {
      throw new BadRequestException('El productId es obligatorio y debe ser numérico.');
    }

    if (!title) {
      throw new BadRequestException('El título del manual es obligatorio.');
    }

    const productoExiste = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!productoExiste) {
      throw new NotFoundException(`El producto con ID #${productId} no existe.`);
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const manualUrl = `${baseUrl}/uploads/manuals/${file.filename}`;

    return this.prisma.productManual.upsert({
      where: { productId },
      create: {
        productId,
        title,
        manualUrl,
        fileName: file.originalname,
        notes: body.notes?.trim() || null,
      },
      update: {
        title,
        manualUrl,
        fileName: file.originalname,
        notes: body.notes?.trim() || null,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });
  }

  // Crear o actualizar (upsert) el manual vinculado al ID del producto (con URL)
  @Post('manuals')
  async guardarManual(
    @Body()
    body: {
      productId: number | string;
      title: string;
      manualUrl: string;
      fileName?: string;
      notes?: string;
    },
  ) {
    const productId = Number(body.productId);
    const title = body.title?.trim();
    const manualUrl = body.manualUrl?.trim();

    if (!productId || isNaN(productId)) {
      throw new BadRequestException('El productId es obligatorio y debe ser numérico.');
    }

    if (!title || !manualUrl) {
      throw new BadRequestException('El título y la URL/ruta del manual son obligatorios.');
    }

    const productoExiste = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!productoExiste) {
      throw new NotFoundException(`El producto con ID #${productId} no existe.`);
    }

    return this.prisma.productManual.upsert({
      where: { productId },
      create: {
        productId,
        title,
        manualUrl,
        fileName: body.fileName?.trim() || null,
        notes: body.notes?.trim() || null,
      },
      update: {
        title,
        manualUrl,
        fileName: body.fileName?.trim() ?? null,
        notes: body.notes?.trim() ?? null,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });
  }

  // Eliminar / desvincular manual por ID de producto
  @Post('manuals/eliminar/:productId')
  async eliminarManualPost(
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.eliminarManualPorProducto(productId);
  }

  @Delete('manuals/product/:productId')
  async eliminarManualDelete(
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.eliminarManualPorProducto(productId);
  }

  private async eliminarManualPorProducto(productId: number) {
    const existente = await this.prisma.productManual.findUnique({
      where: { productId },
    });

    if (!existente) {
      throw new NotFoundException(
        `No existe un manual vinculado al producto #${productId}`,
      );
    }

    return this.prisma.productManual.delete({
      where: { productId },
    });
  }
}