import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import Any = jasmine.Any;
import { TaxDetails } from './tax-details.class';

export class OrderItem {
  constructor(orderItem: OrderItem) {
    this.additionalDiscount = orderItem.additionalDiscount;
    this.categoryId = orderItem.categoryId;
    this.categoryName = orderItem.categoryName;
    this.discountAmount = orderItem.discountAmount;
    this.finalAmount = orderItem.finalAmount;
    this.finalQuantity = orderItem.finalQuantity;
    this.id = orderItem.id;
    this.imageUrl = orderItem.imageUrl;
    this.isRefundable = orderItem.isRefundable;
    this.isReturnable = orderItem.isReturnable;
    this.markedPrice = orderItem.markedPrice;
    this.mrpGrossAmount = orderItem.mrpGrossAmount;
    this.orderId = orderItem.orderId;
    this.orderedQty = orderItem.orderedQty;
    this.productName = orderItem.productName;
    this.refundAmount = orderItem.refundAmount;
    this.salePrice = orderItem.salePrice;
    this.skuCode = orderItem.skuCode;
    this.spGrossAmount = orderItem.spGrossAmount;
    this.status = orderItem.status;
    this.subcategoryId = orderItem.subcategoryId;
    this.subcategoryName = orderItem.subcategoryName;
    this.taxAmount = orderItem.taxAmount;
    this.taxDetails = orderItem.taxDetails;
    this.uom = orderItem.uom;
  }
  @ApiProperty()
  @IsNotEmpty()
  additionalDiscount: Any;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  categoryName: string;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  discountAmount: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  finalAmount: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  finalQuantity: number;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  id: string;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  imageUrl: string;

  @ApiProperty({ type: Boolean })
  @IsNotEmpty()
  isRefundable: boolean;

  @ApiProperty({ type: Boolean })
  @IsNotEmpty()
  isReturnable: boolean;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  markedPrice: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  mrpGrossAmount: number;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  orderedQty: number;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  refundAmount: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  salePrice: number;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  skuCode: string;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  spGrossAmount: number;

  @ApiProperty()
  @IsNotEmpty()
  status: number; // status enum

  @ApiProperty({ type: String })
  @IsNotEmpty()
  subcategoryId: string;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  subcategoryName: string;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  taxAmount: number;

  @ApiProperty({ type: TaxDetails })
  @IsNotEmpty()
  taxDetails: TaxDetails;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  uom: string;
}
