import { Injectable } from '@nestjs/common';
import {
  Between,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { VoucherEntity } from './entity/vouchers.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ApplicableFor } from './enum/applicable-for.enum';
import { VoucherType } from './enum/voucher-type.enum';
import { Event, RuleProperties, TopLevelCondition } from 'json-rules-engine';
import { DiscountType } from './enum/discount-type.enum';
import * as moment from 'moment';
import {
  TargetCampaignEntity,
  TargetCampaignMetadata,
} from './entity/target-campaign.entity';
import { TargetCashbackEntity } from './entity/target-cashback.entity';
import { TargetCampaignUploadBean } from './classes/target-campaign-upload.bean';
import { CommonService } from '../core/common/common.service';
import { FranchiseOrderResponseWithEffectivePrice } from './classes/franchise-order-response-with-effective-price.class';
import { ParseResult } from './classes/parse-result';
import { ErrorBean } from './classes/error.bean';
import { OfferService } from './offer.service';
import { ClientService } from './client.service';
import { TargetType } from './enum/target-type.enum';
import { endOfMonth, startOfMonth } from 'date-fns';
import { OfferEntity } from './entity/offers.entity';
import { WalletListItemResponse } from './classes/wallet-list-item-response.class';

@Injectable()
export class TargetService {
  constructor(
    @InjectRepository(TargetCampaignEntity)
    private readonly targetCampaignRepository: Repository<TargetCampaignEntity>,
    @InjectRepository(TargetCashbackEntity)
    private readonly targetCashbackRepository: Repository<TargetCashbackEntity>,
    private commonService: CommonService,
    private offerService: OfferService,
    private clientService: ClientService,
  ) {}

  async initiateTargetCampaigns(
    targetCampaignUploadBeans: TargetCampaignUploadBean[],
    targetType: string,
    campaignType: string,
    userId: string,
  ) {
    const targetCampaignsList: TargetCampaignEntity[] = [];
    for (const targetCampaignBean of targetCampaignUploadBeans) {
      const targetCampaignEntity =
        TargetCampaignEntity.createTargetCampaignEntity(
          targetCampaignBean.storeId,
          targetType,
          campaignType,
          targetCampaignBean.startDate,
          targetCampaignBean.endDate,
          targetCampaignBean.targetAmount,
          userId,
        );
      targetCampaignEntity.metadata = new TargetCampaignMetadata(
        targetCampaignBean.weeklyCashbackPercent,
        targetCampaignBean.dailyCashbackPercent,
      );
      targetCampaignsList.push(targetCampaignEntity);
    }
    await this.targetCampaignRepository.save(targetCampaignsList);
    for (const campaign of targetCampaignsList) {
      const dailyTarget = this.getDailyTargetValue(
        campaign,
        this.getDaysDiff(campaign.startDate, campaign.endDate),
      );
      await this.createCashbackEntriesFromCampaign(
        campaign,
        campaign.startDate,
        campaign.endDate,
        dailyTarget,
        userId,
      );
    }
    for (const targetCampaign of targetCampaignsList) {
      await this.createDailyOfferForTargetCampaign(targetCampaign, userId);
    }
  }

  async createDailyOfferForTargetCampaign(
    targetCampaign: TargetCampaignEntity,
    userId: string,
  ) {
    const offer = await this.createDailyOfferFromCampaignDetails(
      targetCampaign,
      userId,
    );
    if (offer != null) {
      await this.offerService.createNewVoucher(
        offer.id,
        this.getTargetCampaignVoucherName().toUpperCase(),
        targetCampaign.storeId,
        'FRANCHISE',
        VoucherType.STATIC,
        ApplicableFor.ASSIGNED,
        true,
        targetCampaign.id,
        userId,
      );
    }
  }

  async createCashbackEntriesFromCampaign(
    campaign: TargetCampaignEntity,
    startDate: Date,
    endDate: Date,
    dailyTarget: number,
    userId: string,
  ) {
    if (
      startDate != null &&
      endDate != null &&
      campaign.metadata.dailyCashbackPercent != null
    ) {
      await this.createDailyLoyaltyCashbacks(
        campaign,
        startDate,
        endDate,
        dailyTarget,
        userId,
      );
    }
    if (
      campaign.targetType == 'WEEKLY' &&
      campaign.metadata.weeklyCashbackPercent != null
    ) {
      await this.createCashback(
        campaign.storeId,
        campaign.endDate,
        campaign.metadata.weeklyCashbackPercent,
        campaign.id,
        userId,
        'WEEKLY',
        campaign.targetAmount,
      );
    }
  }

  async getExistingEntriesMap(storeIds: string[]) {
    const targetCampaignList = await this.targetCampaignRepository.find({
      where: { storeId: In(storeIds), active: 1 },
    });
    const TargetCampaignListMap: Map<string, TargetCampaignEntity[]> =
      new Map();
    targetCampaignList.forEach((targetCampaign) => {
      if (TargetCampaignListMap.has(targetCampaign.storeId)) {
        TargetCampaignListMap.get(targetCampaign.storeId).push(targetCampaign);
      } else {
        TargetCampaignListMap.set(targetCampaign.storeId, [targetCampaign]);
      }
    });
    return TargetCampaignListMap;
  }

  async getPendingCashbackListFromDateTypeAndStoreIds(
    cashbackDate: Date,
    targetTypeList: string[],
    storeIds: string[],
    campaignIds: number[],
  ) {
    return await this.targetCashbackRepository.find({
      where: {
        cashback: IsNull(),
        cashbackDate: cashbackDate,
        active: 1,
        targetType: In(targetTypeList),
        targetCampaignId: In(campaignIds),
        ...(storeIds == null ? {} : { storeId: In(storeIds) }),
      },
    });
  }
  async getPendingCashbacksTillDate(
    date: Date,
    targetTypeList: string[],
    storeIds: string[],
    campaignIds: number[],
  ) {
    return await this.targetCashbackRepository.find({
      where: {
        cashback: IsNull(),
        cashbackDate: LessThanOrEqual(date),
        active: 1,
        targetType: In(targetTypeList),
        targetCampaignId: In(campaignIds),
        ...(storeIds == null ? {} : { storeId: In(storeIds) }),
      },
    });
  }

  async getAllPendingCashbacksBetweenDate(
    fromDate: Date,
    toDate: Date,
    targetTypeList: string[],
    storeIds: string[],
  ) {
    return await this.targetCashbackRepository.find({
      where: {
        cashback: IsNull(),
        cashbackDate: Between(fromDate, toDate),
        active: 1,
        targetType: In(targetTypeList),
        ...(storeIds == null ? {} : { storeId: In(storeIds) }),
      },
    });
  }

  async bulkSaveLoyaltyCashback(cashbackList: TargetCashbackEntity[]) {
    await this.targetCashbackRepository.save(cashbackList);
  }

  async processDailyCashbacks(
    targetCashbackList: TargetCashbackEntity[],
    ordersMap: Map<string, FranchiseOrderResponseWithEffectivePrice>,
    vouchersMap: Map<string, VoucherEntity>,
    walletMap: Map<string, WalletListItemResponse>,
    userId: string,
  ) {
    for (const targetCashback of targetCashbackList) {
      const order = ordersMap.get(targetCashback.storeId);
      if (order == null) {
        targetCashback.cashback = 0;
        targetCashback.metadata.effectiveOrderBillAmount = 0;
        targetCashback.metadata.qualifierOrderBillAmount = 0;
        targetCashback.metadata.remarks = 'No Order Placed.';
      } else if (order.hasPendingRefundTicket) {
        targetCashback.metadata.remarks = 'Refund Ticket Pending for order';
      } else if (order.offerData.isOfferApplied == false) {
        targetCashback.cashback = 0;
        targetCashback.metadata.remarks = 'Voucher not applied';
        this.setEffectiveAndQualifierBillAmount(targetCashback, order);
      } else if (targetCashback.cashbackPercent == 0) {
        targetCashback.cashback = 0;
        targetCashback.metadata.remarks = 'Daily cashback is 0';
        this.setEffectiveAndQualifierBillAmount(targetCashback, order);
      } else if (
        order.offerData.voucherCode != vouchersMap.get(order.storeId).code
      ) {
        targetCashback.cashback = 0;
        targetCashback.metadata.remarks = 'Different Voucher Applied';
        this.setEffectiveAndQualifierBillAmount(targetCashback, order);
      } else if (
        !(
          (targetCashback.metadata.isWalletEligible != null &&
            targetCashback.metadata.isWalletEligible == true) ||
          (walletMap != null &&
            walletMap.has(targetCashback.storeId) &&
            walletMap.get(targetCashback.storeId).status == 'ACTIVE')
        )
      ) {
        targetCashback.metadata.remarks = 'Wallet ineligible for cashback.';
        this.setEffectiveAndQualifierBillAmount(targetCashback, order);
      } else {
        this.setEffectiveAndQualifierBillAmount(targetCashback, order);
        targetCashback.cashback = Math.ceil(
          (order.effectiveSpGrossAmountForCashback *
            targetCashback.cashbackPercent) /
            100,
        );
        if (targetCashback.cashback > 0) {
          targetCashback.metadata.isWalletEligible = true;
          targetCashback.metadata.remarks = 'Cashback Processed.';
          await this.clientService.addOrDeductFromWallet(
            targetCashback.storeId,
            targetCashback.cashback,
            'Loyalty-Cashback',
            order.displayOrderId,
            `${targetCashback.cashbackPercent}% cashback on effective order value of ${targetCashback.metadata.effectiveOrderBillAmount}`,
            'WALLET',
            null,
            `LCB-${targetCashback.id}`,
          );
        } else {
          targetCashback.metadata.remarks = 'No Cashback Given.';
          targetCashback.cashback = 0;
        }
        targetCashback.modifiedBy = userId;
      }
      await this.targetCashbackRepository.save(targetCashback);
    }
  }

  private setEffectiveAndQualifierBillAmount(
    loyaltyCashback: TargetCashbackEntity,
    order: FranchiseOrderResponseWithEffectivePrice,
  ) {
    loyaltyCashback.metadata.effectiveOrderBillAmount =
      order.effectiveSpGrossAmountForCashback;
    loyaltyCashback.metadata.qualifierOrderBillAmount =
      order.spGrossAmountWithoutBulkSkus;
  }

  async processWeeklyCashbacks(
    weeklyTargetCashbackList: TargetCashbackEntity[],
    dailyTargetsMap: Map<number, TargetCashbackEntity[]>,
    userId: string,
  ) {
    for (const weeklyTargetCashback of weeklyTargetCashbackList) {
      const dailyTargetCashbackList = dailyTargetsMap.get(
        weeklyTargetCashback.targetCampaignId,
      );
      let totalEffectiveOrderValue = 0;
      let totalQualifierOrderValue = 0;
      let hasPendingDailyCashback = false;
      for (const dailyTargetCashback of dailyTargetCashbackList) {
        if (
          dailyTargetCashback.cashback != null &&
          dailyTargetCashback.metadata.effectiveOrderBillAmount != null
        ) {
          totalEffectiveOrderValue +=
            dailyTargetCashback.metadata.effectiveOrderBillAmount;
          totalQualifierOrderValue +=
            dailyTargetCashback.metadata.qualifierOrderBillAmount;
        } else {
          hasPendingDailyCashback = true;
        }
      }
      if (hasPendingDailyCashback == true) {
        weeklyTargetCashback.metadata.remarks =
          'Daily Cashbacks are yet to be processed for this campaign.';
      } else if (totalQualifierOrderValue < weeklyTargetCashback.targetAmount) {
        weeklyTargetCashback.cashback = 0;
        weeklyTargetCashback.metadata.remarks = 'Target Value Not Met.';
      } else {
        weeklyTargetCashback.cashback = Math.ceil(
          (totalEffectiveOrderValue * weeklyTargetCashback.cashbackPercent) /
            100,
        );
        if (weeklyTargetCashback.cashback > 0) {
          weeklyTargetCashback.metadata.remarks = 'Cashback Processed.';
          await this.clientService.addOrDeductFromWallet(
            weeklyTargetCashback.storeId,
            weeklyTargetCashback.cashback,
            'Loyalty-Cashback',
            `Weekly-Cashback`,
            `${weeklyTargetCashback.cashbackPercent}% extra weekly cashback`,
            'WALLET',
            null,
            `LCB-${weeklyTargetCashback.id}`,
          );
        } else {
          weeklyTargetCashback.metadata.remarks = 'No Cashback Given.';
          weeklyTargetCashback.cashback = 0;
        }
      }
      weeklyTargetCashback.metadata.effectiveOrderBillAmount =
        totalEffectiveOrderValue;
      weeklyTargetCashback.metadata.qualifierOrderBillAmount =
        totalQualifierOrderValue;
      weeklyTargetCashback.modifiedBy = userId;
      await this.targetCashbackRepository.save(weeklyTargetCashback);
    }
  }
  public async validateTargetCampaignUpload(
    targetCampaignUploadBeans: TargetCampaignUploadBean[],
  ) {
    const targetCampaignParseResults =
      new ParseResult<TargetCampaignUploadBean>();
    const existingTargetCampaignsMap: Map<string, TargetCampaignEntity[]> =
      await this.getExistingEntriesMap(
        targetCampaignUploadBeans.map((targetCampaign) => {
          return targetCampaign.storeId;
        }),
      );
    const storeIdsSet = new Set<string>();
    for (const targetCampaignRawBean of targetCampaignUploadBeans) {
      if (
        targetCampaignRawBean.startDate == null ||
        !this.commonService.isValidDateFormat(targetCampaignRawBean.startDate)
      ) {
        targetCampaignRawBean.errors.push(
          new ErrorBean(
            'FIELD_ERROR',
            'invalid start date format',
            'startDate',
          ),
        );
      } else if (
        targetCampaignRawBean.endDate == null ||
        !this.commonService.isValidDateFormat(targetCampaignRawBean.endDate)
      ) {
        targetCampaignRawBean.errors.push(
          new ErrorBean('FIELD_ERROR', 'invalid end date format', 'endDate'),
        );
      } else if (
        !moment(targetCampaignRawBean.startDate, 'YYYY-MM-DD').isSameOrBefore(
          moment(targetCampaignRawBean.endDate, 'YYYY-MM-DD'),
        )
      ) {
        targetCampaignRawBean.errors.push(
          new ErrorBean(
            'FIELD_ERROR',
            'end date should be greater than start date',
            'startDateEndDate',
          ),
        );
      } else if (
        moment(targetCampaignRawBean.startDate, 'YYYY-MM-DD').isSameOrBefore(
          this.commonService.getCurrentIstMomentDateTime(),
        )
      ) {
        targetCampaignRawBean.errors.push(
          new ErrorBean(
            'FIELD_ERROR',
            `start date should be greater than today's date.`,
            'startDateEndDate',
          ),
        );
      } else if (
        existingTargetCampaignsMap.has(targetCampaignRawBean.storeId) &&
        this.checkOverlappingEntry(
          targetCampaignRawBean,
          existingTargetCampaignsMap.get(targetCampaignRawBean.storeId),
        )
      ) {
        targetCampaignRawBean.errors.push(
          new ErrorBean(
            'FIELD_ERROR',
            'overlapping start and end date',
            'startDateEndDate',
          ),
        );
      } else if (targetCampaignRawBean.storeId == null) {
        targetCampaignRawBean.errors.push(
          new ErrorBean('FIELD_ERROR', 'store id cannot be null', 'storeId'),
        );
      } else if (storeIdsSet.has(targetCampaignRawBean.storeId)) {
        targetCampaignRawBean.errors.push(
          new ErrorBean('FIELD_ERROR', 'duplicate store id.', 'storeId'),
        );
      } else if (
        targetCampaignRawBean.weeklyCashbackPercent == null ||
        isNaN(targetCampaignRawBean.weeklyCashbackPercent) ||
        Number(targetCampaignRawBean.weeklyCashbackPercent) < 0
      ) {
        targetCampaignRawBean.errors.push(
          new ErrorBean(
            'FIELD_ERROR',
            'weekly cashback percent invalid value',
            'weeklyCashbackPercent',
          ),
        );
      } else if (
        targetCampaignRawBean.dailyCashbackPercent == null ||
        isNaN(targetCampaignRawBean.dailyCashbackPercent) ||
        !Number.isInteger(Number(targetCampaignRawBean.dailyCashbackPercent)) ||
        Number(targetCampaignRawBean.dailyCashbackPercent) < 0
      ) {
        targetCampaignRawBean.errors.push(
          new ErrorBean(
            'FIELD_ERROR',
            'daily cashback percent invalid value',
            'dailyCashbackPercent',
          ),
        );
      } else if (
        targetCampaignRawBean.targetAmount == null ||
        isNaN(targetCampaignRawBean.targetAmount) ||
        Number(targetCampaignRawBean.targetAmount) < 0
      ) {
        targetCampaignRawBean.errors.push(
          new ErrorBean(
            'FIELD_ERROR',
            'target amount invalid value',
            'targetAmount',
          ),
        );
      } else {
        targetCampaignRawBean.weeklyCashbackPercent = Number(
          targetCampaignRawBean.weeklyCashbackPercent,
        );
        targetCampaignRawBean.dailyCashbackPercent = Number(
          targetCampaignRawBean.dailyCashbackPercent,
        );
        targetCampaignRawBean.targetAmount = Number(
          targetCampaignRawBean.targetAmount,
        );
        storeIdsSet.add(targetCampaignRawBean.storeId);
      }
      if (targetCampaignRawBean.errors.length == 0) {
        targetCampaignParseResults.successRows.push(targetCampaignRawBean);
      } else {
        targetCampaignParseResults.failedRows.push(targetCampaignRawBean);
      }
    }
    return targetCampaignParseResults;
  }

  private checkOverlappingEntry(
    targetCampaignRawBean: TargetCampaignUploadBean,
    targetCampaignEntities: TargetCampaignEntity[],
  ) {
    for (const entity of targetCampaignEntities) {
      if (
        moment(
          entity.startDate.toISOString().split('T')[0],
          'YYYY-MM-DD',
        ).isSameOrBefore(moment(targetCampaignRawBean.endDate, 'YYYY-MM-DD')) &&
        moment(
          entity.endDate.toISOString().split('T')[0],
          'YYYY-MM-DD',
        ).isSameOrAfter(moment(targetCampaignRawBean.startDate, 'YYYY-MM-DD'))
      ) {
        return true;
      }
    }
    return false;
  }

  async getCampaignById(campaignId) {
    return await this.targetCampaignRepository.findOne({
      where: { id: campaignId },
    });
  }

  async getAllCampaigns() {
    return await this.targetCampaignRepository.find({
      order: { modifiedAt: 'desc' },
    });
  }

  async getCashbacksByCampaignId(campaignId: number) {
    return await this.targetCashbackRepository.find({
      where: { targetCampaignId: campaignId, active: 1 },
      order: { cashbackDate: 'asc' },
    });
  }

  async getValuedCashbacksByCampaignId(campaignId: number) {
    return await this.targetCashbackRepository.find({
      where: {
        targetCampaignId: campaignId,
        active: 1,
        cashbackPercent: MoreThan(0),
      },
      order: { cashbackDate: 'asc' },
    });
  }

  async saveTargetCampaign(campaign: TargetCampaignEntity, userId: string) {
    campaign.modifiedBy = userId;
    await this.targetCampaignRepository.save(campaign);
  }

  private getTargetCampaignOfferName(campaignId: number) {
    return 'CB-' + campaignId + '-' + Date.now();
  }

  private createTargetCampaignDailyOffersRule(dailyTarget: number) {
    const offerConditions: TopLevelCondition = {
      all: [
        {
          fact: 'spGrossAmountWithoutBulkSkus',
          operator: 'greaterThanInclusive',
          value: dailyTarget,
        },
      ],
    };
    const event: Event = { type: 'ORDERLEVEL', params: {} };
    const rulesObject: RuleProperties = {
      conditions: offerConditions,
      event: event,
    };
    return rulesObject;
  }

  private getTargetCampaignVoucherName() {
    return 'GUL-' + this.commonService.generateRandomString(4);
  }

  public getDaysDiff(startDate: Date, endDate: Date) {
    return moment(endDate).diff(moment(startDate), 'days') + 1;
  }

  public getDailyTargetValue(
    targetCampaign: TargetCampaignEntity,
    daysNum: number,
  ) {
    let dailyTarget = targetCampaign.targetAmount;
    if (targetCampaign.targetType == 'WEEKLY') {
      dailyTarget = dailyTarget / daysNum;
    }
    return dailyTarget;
  }

  private async createCashback(
    storeId: string,
    cashbackDate: Date,
    cashbackPercentage: number,
    campaignId: number,
    userId: string,
    targetType: string,
    targetAmount: number,
  ) {
    const loyaltyCashback =
      TargetCashbackEntity.createTargetCashbackEntityFromCampaign(
        storeId,
        cashbackDate,
        cashbackPercentage,
        campaignId,
        userId,
        targetType,
        targetAmount,
      );
    await this.targetCashbackRepository.save(loyaltyCashback);
  }

  private async createDailyLoyaltyCashbacks(
    campaign: TargetCampaignEntity,
    startDate: Date,
    endDate: Date,
    dailyTarget: number,
    userId: string,
  ) {
    const startDateMoment = moment(startDate);
    const daysNum = moment(endDate).diff(startDateMoment, 'days') + 1;
    for (let i = 0; i < daysNum; i++) {
      const cashbackDate = startDateMoment.clone().add(i, 'days');
      await this.createCashback(
        campaign.storeId,
        cashbackDate.toDate(),
        campaign.metadata.dailyCashbackPercent,
        campaign.id,
        userId,
        TargetType.DAILY,
        dailyTarget,
      );
    }
  }

  async getAllCashbacksFromCampaignIdsAndType(
    targetCampaignIdList: number[],
    targetTypeList: TargetType[],
  ) {
    return await this.targetCashbackRepository.find({
      where: {
        targetCampaignId: In(targetCampaignIdList),
        active: 1,
        targetType: In(targetTypeList),
      },
    });
  }

  async getCampaignByDateAndStoreId(storeId: string, date: Date) {
    return this.targetCampaignRepository.findOne({
      where: {
        storeId: storeId,
        startDate: LessThanOrEqual(date),
        endDate: MoreThanOrEqual(date),
        status: 1,
        active: 1,
      },
    });
  }

  async getRunningCampaignsByDate(date: Date) {
    return this.targetCampaignRepository.find({
      where: {
        startDate: LessThanOrEqual(date),
        endDate: MoreThanOrEqual(date),
        status: 1,
        active: 1,
      },
    });
  }

  async getMonthlyEarningByStoreId(storeId: string) {
    const currentDate = new Date();
    const startOfMonthDate = startOfMonth(currentDate);
    const endOfMonthDate = endOfMonth(currentDate);
    const cashbackSum = await this.targetCashbackRepository
      .createQueryBuilder('tc')
      .select('SUM(tc.cashback)', 'totalCashback')
      .where('tc.storeId = :storeId', { storeId })
      .andWhere('tc.createdAt BETWEEN :startOfMonth AND :endOfMonth', {
        startOfMonth: startOfMonthDate,
        endOfMonth: endOfMonthDate,
      })
      .getRawOne();
    return cashbackSum.totalCashback != null
      ? Number(cashbackSum.totalCashback)
      : 0;
  }

  async getLifetimeEarningByStoreId(storeId: string) {
    const cashbackSum = await this.targetCashbackRepository
      .createQueryBuilder('tc')
      .select('SUM(tc.cashback)', 'totalCashback')
      .where('tc.storeId = :storeId', { storeId })
      .getRawOne();
    return cashbackSum.totalCashback != null
      ? Number(cashbackSum.totalCashback)
      : 0;
  }

  async createDailyOfferFromCampaignDetails(
    targetCampaign: TargetCampaignEntity,
    userId: string,
  ): Promise<OfferEntity> {
    if (targetCampaign.metadata.dailyCashbackPercent > 0) {
      const daysNum = this.getDaysDiff(
        targetCampaign.startDate,
        targetCampaign.endDate,
      );
      const dailyTarget = this.getDailyTargetValue(targetCampaign, daysNum);
      const offerTitle = `Sorted गाल्ला`;
      const offerTerms = `${targetCampaign.metadata.dailyCashbackPercent}% Cashback on effective order of ${dailyTarget}.\nT&C:\nApplicable on only non bulk items.\nCashback will be processed post refunds.\nCashback will be received in Sorted wallet post all refund against that order are closed.`;
      return await this.offerService.createNewOffer(
        offerTerms,
        offerTitle,
        moment(targetCampaign.startDate, 'YYYY-MM-DD')
          .subtract(1, 'days')
          .set({
            hour: 2,
            minute: 0,
          })
          .toDate(),
        moment(targetCampaign.endDate, 'YYYY-MM-DD')
          .subtract(1, 'day')
          .set({
            hour: 18,
            minute: 0,
          })
          .toDate(),
        null,
        DiscountType.PERCENT,
        targetCampaign.metadata.dailyCashbackPercent,
        this.createTargetCampaignDailyOffersRule(dailyTarget),
        this.getTargetCampaignOfferName(targetCampaign.id),
        'CASHBACK',
        true,
        userId,
      );
    } else {
      return null;
    }
  }
}
