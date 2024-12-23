import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { SkuDiscount } from './sku-discount.class';
import { OrderLevel } from './order-level.class';
import { OfferEntity } from '../entity/offers.entity';
import { OfferDetails } from './offer-details.class';

export class OfferResponse {
  @ApiProperty({ type: OfferEntity })
  @IsNotEmpty()
  offerDetails: OfferDetails;

  @ApiProperty({ type: OrderLevel })
  @IsNotEmpty()
  orderLevel: OrderLevel;

  @ApiProperty({ type: [SkuDiscount] })
  @IsNotEmpty()
  skuLevel: SkuDiscount[];
}
