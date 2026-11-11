import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VoltexController } from './voltex/voltex.controller'; // Ajusta la ruta si tu carpeta se llama distinto
import { PrismaService } from './prisma.service'; // Asegúrate de que apunte a tu archivo de Prisma

@Module({
  imports: [],
  controllers: [AppController, VoltexController],
  providers: [
    AppService, 
    PrismaService // ¡Aquí registramos el servicio de base de datos que necesita tu controlador!
  ],
})
export class AppModule {}