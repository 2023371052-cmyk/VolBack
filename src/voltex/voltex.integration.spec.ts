import { Test, TestingModule } from '@nestjs/testing';
import { VoltexController } from './voltex.controller';
import { PrismaService } from '../prisma.service';
import { describe, it as test, expect, beforeEach, jest } from '@jest/globals';

describe('Pruebas de Integración - 7VOLTEX Backend (Fase 3)', () => {
  let controller: VoltexController;

  const mockPrismaService: any = {
    product: {
      findMany: (jest.fn() as any).mockResolvedValue([
        { id: 1, name: 'Supercargador Vortech', price: 28500, category: 'formula' }
      ]),
      findUnique: jest.fn().mockImplementation(async (args: any) => {
        if (args.where.id === 999) return null;
        return { id: args.where.id, name: 'Supercargador Test', category: 'karting' };
      }),
    },
    order: {
      create: (jest.fn() as any).mockResolvedValue({ id: 50, totalAmount: 28500, status: 'completed' }),
    },
    orderDetail: {
      create: (jest.fn() as any).mockResolvedValue({ id: 1 }),
    }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoltexController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<VoltexController>(VoltexController);
  });

  // 1. Integración entre controlador y servicio (endpoint de productos)
  test('AUT-04 (Integración): El endpoint /api/productos se comunica correctamente con Prisma y devuelve JSON', async () => {
    const resultado = await controller.getProducts();
    expect(resultado).toBeDefined();
    expect(Array.isArray(resultado)).toBe(true);
    expect(resultado[0]).toHaveProperty('name', 'Supercargador Vortech');
  });

  // 2. Validación de respuesta cuando un componente o recurso no existe
  test('AUT-05 (Integración): El sistema responde con estructura de error controlada si el producto no se halla', async () => {
    const respuesta = await controller.getProductById('999');
    expect(respuesta).toEqual({
      success: false,
      message: 'Componente no encontrado en Pits.',
    });
  });

  // 3. Operación de persistencia y registro completo de una orden de compra
  test('AUT-06 (Persistencia): El registro de una orden de compra almacena la cabecera y detalles en la BD', async () => {
    const ordenData = {
      userId: 1,
      totalAmount: 28500,
      items: [{ productId: 1, quantity: 1, unitPrice: 28500 }]
    };
    const respuesta = await controller.createOrder(ordenData);
    expect(respuesta).toHaveProperty('orderId', 50);
    expect(respuesta.message).toContain('¡Orden registrada con éxito');
  });

});