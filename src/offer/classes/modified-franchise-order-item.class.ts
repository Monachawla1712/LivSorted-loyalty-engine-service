import { FranchiseOrder, FranchiseOrderItem } from './franchise-order.class';

export class ModifiedFranchiseOrderItem extends FranchiseOrderItem {
  constructor(
    orderItem: FranchiseOrderItem,
    order: FranchiseOrder,
    offerAppliedSkuCount: number,
  ) {
    super(orderItem);
    Object.assign(this, order);
    this.offerAppliedSkuCount = offerAppliedSkuCount;
  }
  amountReceived: number;
  channel: number;
  customerId: number;
  deliveryAddress: number;
  displayOrderId: number;
  extraFeeDetails: number;
  finalBillAmount: number;
  itemCount: number;
  quantity: number;
  refundAmount: number;
  storeDeviceId: string;
  storeId: string;
  totalAdditionalDiscount: number;
  totalDiscountAmount: number;
  totalExtraFeeAmount: number;
  totalMrpGrossAmount: number;
  totalSpGrossAmount: number;
  totalTaxAmount: number;
  offerAppliedSkuCount: number;
}
