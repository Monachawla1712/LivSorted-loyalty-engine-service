import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { OfferParamsEntity } from './src/offer/entity/params.entity';
import { BulkUploadEntity } from './src/offer/entity/bulk-upload.entity';

config();

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  host: configService.get('DATABASE_HOST'),
  port: configService.get('DATABASE_PORT'),
  username: configService.get('DATABASE_USERNAME'),
  password: configService.get('DATABASE_PASSWORD'),
  database: 'postgres',
  schema: 'offers',
  entities: ['src/**/entity/*.entity.ts', OfferParamsEntity, BulkUploadEntity],
  synchronize: false,
  migrationsRun: true,
  migrationsTableName: 'migrations',
  migrations: ['migrations/*'],
});
