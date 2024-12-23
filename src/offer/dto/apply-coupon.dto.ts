import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { Order } from '../classes/order.class';

export class ApplyCouponDto {
  @ApiProperty({ type: Order })
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  code: string;
}
