import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { DiscountType } from '../enum/discount-type.enum';
import { Type } from 'class-transformer';
import { ConditionType } from '../enum/condition-type.enum';
import { Condition } from '../classes/condition.class';
import { OfferType } from '../enum/offer-type.enum';
import { OfferLevel } from '../enum/offer-level.enum';

export class UpdateOfferDto {
  @IsOptional()
  @IsNotEmpty()
  discount_type: DiscountType;

  @IsOptional()
  @IsNotEmpty()
  @IsNumber()
  discount_value: number;

  @IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  sidebarNote: string;

  @IsOptional()
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  offer_start: Date;

  @IsOptional()
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  offer_end: Date;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  terms: string;

  @IsOptional()
  @IsNotEmpty()
  conditions: Condition[];

  @IsOptional()
  @IsNotEmpty()
  type: OfferType;

  @IsOptional()
  @IsNotEmpty()
  offerCondition: ConditionType;

  @IsOptional()
  @IsNotEmpty()
  offerLevel: OfferLevel;

  @IsOptional()
  @IsNotEmpty()
  max_limit: number;

  @IsOptional()
  @IsNotEmpty()
  active: boolean;
}
