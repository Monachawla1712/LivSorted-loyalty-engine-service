import { OfferData } from './franchise-order.class';

export class FranchiseOrderResponseWithEffectivePrice {
  storeId: string;
  displayOrderId: string;
  effectiveSpGrossAmountForCashback: number;
  spGrossAmountWithoutBulkSkus: number;
  hasPendingRefundTicket: boolean;
  offerData: OfferData;
}
