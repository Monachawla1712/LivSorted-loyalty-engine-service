import { InternalServerErrorException } from '@nestjs/common';
import { Expose, plainToClass } from 'class-transformer';
import { IsEnum, validateSync, IsNotEmpty } from 'class-validator';

export enum Environment {
  DEVELOPMENT = 'dev',
  PRODUCTION = 'prod',
}

export class EnvironmentVariables {
  @Expose()
  @IsEnum(Environment)
  ENV!: Environment;

  @Expose()
  PORT!: string;

  @IsNotEmpty()
  @Expose()
  DATABASE_HOST!: string;

  @Expose()
  DATABASE_PORT?: string;

  @Expose()
  DATABASE_USERNAME?: string;

  @Expose()
  DATABASE_PASSWORD?: string;

  @Expose()
  DATABASE_NAME?: string;

  @Expose()
  DATABASE_SCHEMA?: string;

  @Expose()
  ORDER_SERVICE_BASE_URL?: string;

  @Expose()
  PAYMENT_SERVICE_BASE_URL?: string;

  @Expose()
  INTERNAL_TOKEN: string;
}

export function validate(config: Record<string, unknown>) {
  const transformedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
    excludeExtraneousValues: true,
  });

  const errors = validateSync(transformedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new InternalServerErrorException(errors.toString());
  }

  return transformedConfig;
}
