import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Config } from './config/configuration';
import { LoggerFactory } from './core/logger-factory';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: LoggerFactory('loyalty_app'),
  });
  app.enableCors();
  app.setGlobalPrefix('offers');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = app.get<ConfigService<Config, true>>(ConfigService);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Offer Service')
    .setDescription('Service for Offers')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'apiKey',
        name: 'Authorization',
        description: 'Enter JWT Token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('/offers/docs', app, document);

  await app.listen(config.get('port'));
}
bootstrap();
