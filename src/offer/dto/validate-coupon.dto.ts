import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { Order } from '../classes/order.class';

export class ValidateCouponDto {
  @ApiProperty({ type: Order })
  @IsNotEmpty()
  order: Order;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  code: string;
}
