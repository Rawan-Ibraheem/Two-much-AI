import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Vite dev server default origin. Single hardcoded origin is enough for the
  // hackathon - revisit if the frontend ever gets deployed somewhere else.
  app.enableCors({ origin: 'http://localhost:5173' });
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`dawasearch-backend listening on http://localhost:${port}`);
}
bootstrap();
