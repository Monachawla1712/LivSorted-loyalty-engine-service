import { ErrorBean } from './error.bean';

export class TargetCampaignUploadBean {
  weeklyCashbackPercent: number;
  dailyCashbackPercent: number;
  storeId: string;
  startDate: string;
  endDate: string;
  targetAmount: number;
  errors: ErrorBean[] = [];

  static getHeaderMapping() {
    return 'storeId:Store Id,targetAmount:Target Amount,startDate:Start Date,endDate:End Date,weeklyCashbackPercent:Weekly Cashback Percent,dailyCashbackPercent:Daily Cashback Percent';
  }
}
