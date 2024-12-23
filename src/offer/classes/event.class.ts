import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { OfferType } from '../enum/offer-type.enum';

export class OfferEvent {
  @ApiProperty({ enum: OfferType })
  @IsNotEmpty()
  type: OfferType;

  @ApiProperty()
  params?: object;
}
