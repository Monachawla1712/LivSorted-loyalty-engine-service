import { OfferParamsEntity } from './offer/entity/params.entity';

require('newrelic');
import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CommonModule } from './core/common/common.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { RolesGuard } from './core/guards/roles.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoucherEntity } from './offer/entity/vouchers.entity';
import { OfferEntity } from './offer/entity/offers.entity';
import { OfferModule } from './offer/offer.module';
import { RedemptionEntity } from './offer/entity/redemption.entity';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { LoggingMiddleware } from './core/logging.middleware';
import { BulkUploadEntity } from './offer/entity/bulk-upload.entity';
import { TargetCampaignEntity } from './offer/entity/target-campaign.entity';
import { TargetCashbackEntity } from './offer/entity/target-cashback.entity';
import { AsyncContextModule } from '@nestjs-steroids/async-context';
import { PrivilegeHandlerInterceptor } from './core/privilege.interceptor';
import { PrivilegeService } from './privilege/privilege.service';
import { PrivilegeEndpointsEntity } from './privilege/entity/privilege-endpoints.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validate,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: 5432,
        username: configService.get('DATABASE_USERNAME'),
        password: configService.get('DATABASE_PASSWORD'),
        database: 'postgres',
        schema: 'offers',
        entities: [
          VoucherEntity,
          OfferEntity,
          RedemptionEntity,
          OfferParamsEntity,
          BulkUploadEntity,
          TargetCampaignEntity,
          TargetCashbackEntity,
          PrivilegeEndpointsEntity,
        ],
        logging: false,
      }),
      inject: [ConfigService],
    }),
    CommonModule,
    OfferModule,
    TypeOrmModule.forFeature([PrivilegeEndpointsEntity]),
    AsyncContextModule.forRoot(),
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    LoggingMiddleware,
    PrivilegeService,
    {
      provide: APP_INTERCEPTOR,
      useClass: PrivilegeHandlerInterceptor,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
