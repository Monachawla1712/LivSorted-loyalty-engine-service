import { TargetCampaignMetadata } from '../entity/target-campaign.entity';

export class TargetListItemBean {
  id: number = null;
  targetAmount: number = null;
  targetType: string = null;
  qualifierOrderBillAmount: number = null;
  effectiveOrderBillAmount: number = null;
  remarks: string = null;
  cashback: number = null;
  cashbackPercent: number = null;
}

export class DailyTargetListItemBean extends TargetListItemBean {
  constructor() {
    super();
  }
  dailyCashbackStatus: string;
}

export class DailyTargetCashbackResponseBean {
  targetList: TargetListItemBean[] = [];
  currentQualifierAmount: number = null;
  todayTargetAmount: number = null;
  todayRemainingTargetAmount: number = null;
  todayTargetCompletionPercentage: number = null;
}

export class WeeklyTargetCashbackResponseBean extends TargetListItemBean {
  constructor() {
    super();
  }
  totalQualifierAmount: number;
  remainingTargetAmount: number;
  targetCompletionPercentage: number;
}

export class TargetCampaignDetails {
  id: number = null;
  storeId: string = null;
  targetType: string = null;
  metadata: TargetCampaignMetadata = new TargetCampaignMetadata(null, null);
  campaignType: string = null;
  targetAmount: number = null;
  status: number = null;
}

export class OtherCashbackDetails {
  monthlyPotentialCashback: number = null;
  currentMonthTotalEarning: number = null;
  lifetimeTotalEarning: number = null;
  rules: string[] = null;
  info: string = null;
  footer: string = null;
}

export class TargetCampaignResponse {
  targetCampaignDetails?: TargetCampaignDetails = null;
  dailyTargetCashbackDetails?: DailyTargetCashbackResponseBean = null;
  weeklyTargetCashbackDetails?: WeeklyTargetCashbackResponseBean = null;
  otherCashbackDetails?: OtherCashbackDetails = null;
}
