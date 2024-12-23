import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import * as moment from 'moment/moment';

export class TargetCampaignMetadata {
  weeklyCashbackPercent: number;
  dailyCashbackPercent: number;

  constructor(weeklyCashbackPercent: number, dailyCashbackPercent: number) {
    this.dailyCashbackPercent = dailyCashbackPercent;
    this.weeklyCashbackPercent = weeklyCashbackPercent;
  }
}

@Entity('target_campaigns')
export class TargetCampaignEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'store_id' })
  storeId: string;

  @Column({ name: 'target_type' })
  targetType: string;

  @Column({ type: 'jsonb' })
  metadata: TargetCampaignMetadata;

  @Column({ name: 'start_date' })
  startDate: Date;

  @Column({ name: 'end_date' })
  endDate: Date;

  @Column({ name: 'campaign_type' })
  campaignType: string;

  @Column({ name: 'target_amount', type: 'numeric', precision: 10, scale: 2 })
  targetAmount: number;

  @Column()
  status: number;

  @Column()
  active: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by' })
  createdBy: string;

  @UpdateDateColumn({ name: 'modified_at' })
  modifiedAt: Date;

  @Column({ name: 'modified_by' })
  modifiedBy: string;

  static createTargetCampaignEntity(
    storeId: string,
    targetType: string,
    campaignType: string,
    startDate: string,
    endDate: string,
    targetAmount: number,
    userId: string,
  ) {
    const targetCampaignEntity = new TargetCampaignEntity();
    targetCampaignEntity.storeId = storeId;
    targetCampaignEntity.campaignType = campaignType;
    targetCampaignEntity.startDate = moment(startDate).toDate();
    targetCampaignEntity.targetType = targetType;
    targetCampaignEntity.endDate = moment(endDate).toDate();
    targetCampaignEntity.targetAmount = targetAmount;
    targetCampaignEntity.status = 1;
    targetCampaignEntity.active = 1;
    targetCampaignEntity.createdBy = userId;
    targetCampaignEntity.modifiedBy = userId;
    return targetCampaignEntity;
  }
}
