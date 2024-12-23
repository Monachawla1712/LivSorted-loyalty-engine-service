export class FranchiseSkuDiscount {
  skuCode: string;
  discountValue: number;
}

export class FranchiseOrderLevel {
  discountValue: number;
}

export class CashbackDetails {
  cashbackPercent: number;
  cashbackAmount: number;
}

export class FranchiseOfferResponse {
  offerId: string;
  offerTitle: string;
  voucher: string;
  offerType: string;
  orderLevel: FranchiseOrderLevel;
  skuLevel: FranchiseSkuDiscount[];
  cashbackDetails: CashbackDetails;
}
