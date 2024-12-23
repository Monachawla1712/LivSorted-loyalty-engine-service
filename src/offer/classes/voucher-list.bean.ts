import { OfferResponseBean } from './offer-response.bean';

export class VoucherListBean {
  id: string = null;
  isOfferApplicable?: boolean = null;
  code?: string = null;
  offer: OfferResponseBean = new OfferResponseBean();
}
