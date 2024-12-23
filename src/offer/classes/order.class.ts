import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { OrderItem } from './order-item.class';
import Any = jasmine.Any;

class OfferData {
  offerId: string;
  voucherCode: string;
  isOfferApplied: boolean;
}

export class Order {
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

  @ApiProperty({ type: String })
  @IsNotEmpty()
  id: string;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  itemCount: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  notes: number;

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
  shippingMethod: Any;

  @ApiProperty({ type: [OrderItem] })
  @IsNotEmpty()
  orderItems: OrderItem[];

  @ApiProperty()
  @IsNotEmpty()
  status: Any;

  @ApiProperty()
  @IsNotEmpty()
  storeDeviceId: string;

  @ApiProperty()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({})
  @IsNotEmpty()
  taxDetails: OrderItem[];

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

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  orderCount: number;

  @ApiProperty()
  @IsNotEmpty()
  offerData: OfferData;
}
