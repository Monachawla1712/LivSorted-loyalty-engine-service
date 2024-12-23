import { Module } from '@nestjs/common';
import { OfferController } from './offer.controller';
import { OfferService } from './offer.service';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfferEntity } from './entity/offers.entity';
import { VoucherEntity } from './entity/vouchers.entity';
import { RedemptionEntity } from './entity/redemption.entity';
import { RulesEngineService } from '../core/common/rules-engine.service';
import { Engine } from 'json-rules-engine';
import { ConfigService } from '@nestjs/config';
import { CommonService } from '../core/common/common.service';
import { OfferParamsEntity } from './entity/params.entity';
import { OfferParamsService } from './offer-params.service';
import { BulkUploadEntity } from './entity/bulk-upload.entity';
import { TargetCampaignEntity } from './entity/target-campaign.entity';
import { TargetCashbackEntity } from './entity/target-cashback.entity';
import { TargetController } from './target.controller';
import { TargetService } from './target.service';
import { ClientService } from './client.service';

@Module({
  imports: [
    JwtModule.register({}),
    HttpModule,
    TypeOrmModule.forFeature([
      OfferEntity,
      OfferParamsEntity,
      VoucherEntity,
      RedemptionEntity,
      BulkUploadEntity,
      TargetCampaignEntity,
      TargetCashbackEntity,
    ]),
  ],
  controllers: [OfferController, TargetController],
  providers: [
    OfferService,
    RulesEngineService,
    Engine,
    ConfigService,
    CommonService,
    OfferParamsService,
    TargetService,
    ClientService,
  ],
})
export class OfferModule {}
