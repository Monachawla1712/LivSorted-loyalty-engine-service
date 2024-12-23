import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { VoucherType } from '../enum/voucher-type.enum';
import { ApplicableFor } from '../enum/applicable-for.enum';

export class CreateVoucherDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsUUID()
  @IsNotEmpty()
  offer_id: string;

  @IsOptional()
  voucher_type: VoucherType;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  assigned_to: string[];

  @IsNotEmpty()
  applicable_for: ApplicableFor;

  @IsOptional()
  is_public: boolean;

  @IsOptional()
  voucher_for: string;
}
