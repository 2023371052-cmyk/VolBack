import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilitar CORS para Angular
  app.enableCors();

  await app.listen(3000);
  console.log('🚀 Backend de 7VOLTEX Motorsport corriendo en http://localhost:3000');
}
bootstrap();