import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export class TargetCashbackMetadata {
  qualifierOrderBillAmount: number = null;
  effectiveOrderBillAmount: number = null;
  remarks: string = null;
  isWalletEligible = false;
}

@Entity('target_cashbacks')
export class TargetCashbackEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'store_id' })
  storeId: string;

  @Column({ name: 'cashback_date' })
  cashbackDate: Date;

  @Column({ name: 'target_amount', type: 'numeric', precision: 10, scale: 2 })
  targetAmount: number;

  @Column({ name: 'target_type' })
  targetType: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  cashback: number = null;

  @Column({ name: 'cashback_percent', type: 'numeric', precision: 5, scale: 2 })
  cashbackPercent: number;

  @Column({ type: 'jsonb' })
  metadata: TargetCashbackMetadata = new TargetCashbackMetadata();

  @Column({ name: 'target_campaign_id' })
  targetCampaignId: number;

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

  static createTargetCashbackEntityFromCampaign(
    storeId: string,
    cashbackDate: Date,
    dailyCashbackPercent: number,
    targetCampaignId: number,
    userId: string,
    targetType: string,
    targetAmount: number,
  ) {
    const targetCashbackEntity = new TargetCashbackEntity();
    targetCashbackEntity.targetType = targetType;
    targetCashbackEntity.cashbackDate = cashbackDate;
    targetCashbackEntity.cashbackPercent = dailyCashbackPercent;
    targetCashbackEntity.targetAmount = targetAmount;
    targetCashbackEntity.targetCampaignId = targetCampaignId;
    targetCashbackEntity.storeId = storeId;
    targetCashbackEntity.createdBy = userId;
    targetCashbackEntity.modifiedBy = userId;
    targetCashbackEntity.active = 1;
    return targetCashbackEntity;
  }
}
