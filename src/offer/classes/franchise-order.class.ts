export class FranchiseOrder {
  id: string;
  storeId: string;
  displayOrderId: string;
  status: string = null;
  submittedAt: Date | null;
  finalBillAmount: number = null;
  itemCount: number = null;
  deliveryDate: Date;
  totalMrpGrossAmount: number = null;
  totalSpGrossAmount: number = null;
  totalDiscountAmount: number = null;
  orderItems: FranchiseOrderItem[] = [];
  orderCharges: any | null;
  estimatedBillAmount: number;
  isSrpStore: number;
  categoryCount: { [key: string]: number };
  validMinOrderRule: boolean;
  orderCount: number = null;
  spGrossAmountWithoutBulkSkus: number;
}

export class OfferData {
  offerId: string;
  voucherCode: string;
  isOfferApplied: boolean;
  offerType: string;
  amount: number;
  orderDiscount: number;
  offerTitle: string;
}

export class FranchiseOrderItem {
  constructor(orderItem: FranchiseOrderItem) {
    Object.assign(this, orderItem);
  }

  id: string;
  orderId: string;
  skuCode: string;
  moq: number;
  whId: number;
  productName: string;
  categoryName: string;
  orderedQty: number;
  finalQuantity: number;
  salePrice: number;
  markedPrice: number;
  mrpGrossAmount: number;
  spGrossAmount: number;
  finalAmount: number;
  status: string;
  orderedCrateQty: number;
  finalCrateQty: number;
  uom: string;
  marginDiscountPercent: number | null;
}
