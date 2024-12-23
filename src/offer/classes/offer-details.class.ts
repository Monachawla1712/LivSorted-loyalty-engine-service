import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { OrderLevel } from './order-level.class';
import { OfferEntity } from '../entity/offers.entity';
import { VoucherEntity } from '../entity/vouchers.entity';

export class OfferDetails {
  constructor(offer: OfferEntity, voucher: VoucherEntity) {
    this.offer = offer;
    this.voucher = voucher;
  }

  @ApiProperty({ type: OfferEntity })
  @IsNotEmpty()
  offer: OfferEntity;

  @ApiProperty({ type: OrderLevel })
  @IsNotEmpty()
  voucher: VoucherEntity;
}
