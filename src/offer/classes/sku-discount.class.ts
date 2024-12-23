import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { DiscountType } from '../enum/discount-type.enum';

export class SkuDiscount {
  @ApiProperty({ type: String })
  @IsNotEmpty()
  skuCode: string;

  @ApiProperty({ enum: DiscountType })
  @IsNotEmpty()
  discountType: DiscountType;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  discountAmount: number;
}
