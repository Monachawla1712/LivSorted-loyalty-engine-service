import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { DiscountType } from '../enum/discount-type.enum';

export class OrderLevel {
  @ApiProperty({ enum: DiscountType })
  @IsNotEmpty()
  discountType: DiscountType;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  discountValue: number;
}
