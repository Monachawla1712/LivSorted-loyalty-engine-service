import { IsDate, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { DiscountType } from '../enum/discount-type.enum';
import { Type } from 'class-transformer';
import { ConditionType } from '../enum/condition-type.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Condition } from '../classes/condition.class';
import { OfferType } from '../enum/offer-type.enum';
import { OfferLevel } from '../enum/offer-level.enum';

export class CreateOfferDto {
  @IsNotEmpty()
  discount_type: DiscountType;

  @IsNotEmpty()
  @IsNumber()
  discount_value: number;

  @IsString()
  title: string;

  @IsString()
  sidebarNote: string;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  offer_start: Date;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  offer_end: Date;

  @IsNotEmpty()
  @IsString()
  terms: string;

  @ApiProperty({ type: [Condition] })
  @IsNotEmpty()
  conditions: Condition[];

  @ApiProperty({ enum: OfferType })
  @IsNotEmpty()
  type: OfferType;

  @IsNotEmpty()
  offerCondition: ConditionType;

  @ApiProperty({ enum: OfferLevel })
  @IsNotEmpty()
  offerLevel: OfferLevel;

  @ApiProperty({ enum: OfferLevel })
  @IsNotEmpty()
  max_limit: number;

  @IsNotEmpty()
  active: boolean;
}
