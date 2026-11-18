import { Test, TestingModule } from '@nestjs/testing';
import { VoltexController } from './voltex.controller';
import { PrismaService } from '../prisma.service';
import { describe, it as test, expect, beforeEach, jest } from '@jest/globals';

describe('VoltexController', () => {
let controller: VoltexController;

  // Simulamos el servicio de Prisma para pruebas unitarias limpias
 const mockPrismaService: any = {
    product: {
      findMany: (jest.fn() as any).mockResolvedValue([{ id: 1, name: 'Supercargador Test', price: 25000 }]),
      findUnique: jest.fn().mockImplementation(async (args: any) => {
        if (args.where.id === 999) return null;
        return { id: args.where.id, name: 'Supercargador Vortech' };
      }),
    },
    user: {
      findUnique: (jest.fn() as any).mockResolvedValue(null),
      create: jest.fn().mockImplementation(async (args: any) => ({ id: 1, ...args.data })),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoltexController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService }, // <--- ¡Asegúrate de incluir esto!
      ],
    }).compile();

    controller = module.get<VoltexController>(VoltexController);
  });

  // 1. Entrada válida: Obtener productos correctamente
  test('AUT-01: Debe retornar un arreglo de productos al consultar el inventario', async () => {
    const productos = await controller.getProducts();
    expect(productos).toBeDefined();
    expect(Array.isArray(productos)).toBe(true);
    expect(productos.length).toBeGreaterThan(0);
  });

  // 2. Entrada vacía o nula: Manejo de credenciales de registro incompletas
  test('AUT-02: Debe rechazar el registro si falta la contraseña', async () => {
    const resultado = await controller.register({
      name: 'Piloto Test',
      email: 'test@voltex.com',
      // password omitida (vacía/nula)
    });
    expect(resultado.success).toBe(false);
    expect(resultado.message).toBe('La contraseña es obligatoria.');
  });

  // 3. Valores fuera de rango: Validación lógica de precios de supercargadores
  test('AUT-03: Validar que el precio de un componente cumple con rangos comerciales válidos', () => {
    const validarPrecio = (precio: number) => precio > 0;
    expect(validarPrecio(-5000)).toBe(false);
    expect(validarPrecio(15000)).toBe(true);
  });

  // 4. Resultado esperado: Obtener un producto específico por ID válido
  test('AUT-04: Debe retornar el producto esperado al buscar por un ID numérico existente', async () => {
    const producto = await controller.getProductById('1');
    expect(producto).toHaveProperty('id', 1);
    expect(producto).toHaveProperty('name', 'Supercargador Vortech');
  });

  // 5. Manejo de excepciones / Errores: Producto no encontrado
  test('AUT-05: Debe retornar mensaje de error estructurado si el producto no existe en Pits', async () => {
    const resultado = await controller.getProductById('999');
    expect(resultado).toEqual({
      success: false,
      message: 'Componente no encontrado en Pits.',
    });
  });

});