import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import Any = jasmine.Any;
import { OrderItem } from './order-item.class';
import { Order } from './order.class';

export class ModifiedOrderItem extends OrderItem {
  constructor(orderItem: OrderItem, order: Order) {
    super(orderItem);
    Object.assign(this, order);
  }
  @ApiProperty({ type: Number })
  @IsNotEmpty()
  amountReceived: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  channel: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  customerId: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  deliveryAddress: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  displayOrderId: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  extraFeeDetails: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  finalBillAmount: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  itemCount: number;

  @ApiProperty()
  @IsNotEmpty()
  paymentMethod: Any;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  refundAmount: number;

  @ApiProperty()
  @IsNotEmpty()
  storeDeviceId: string;

  @ApiProperty()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  totalAdditionalDiscount: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  totalDiscountAmount: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  totalExtraFeeAmount: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  totalMrpGrossAmount: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  totalSpGrossAmount: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  totalTaxAmount: number;
}
