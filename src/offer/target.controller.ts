import {
  Controller,
  Headers,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseInterceptors,
  Param,
  Body,
  Put,
} from '@nestjs/common';
import { OfferService } from './offer.service';
import { ApiBasicAuth } from '@nestjs/swagger';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { VoucherEntity } from './entity/vouchers.entity';
import { CommonService } from '../core/common/common.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { TargetCampaignUploadBean } from './classes/target-campaign-upload.bean';
import { ParseResult } from './classes/parse-result';
import { FranchiseOrderResponseWithEffectivePrice } from './classes/franchise-order-response-with-effective-price.class';
import { TargetCashbackEntity } from './entity/target-cashback.entity';
import { TargetService } from './target.service';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { TargetCampaignEntity } from './entity/target-campaign.entity';
import { ClientService } from './client.service';
import { TargetType } from './enum/target-type.enum';
import { CashbackCronDto } from './dto/cashback-cron.dto';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { CustomLogger } from '../core/custom-logger';
import {
  DailyTargetCashbackResponseBean,
  DailyTargetListItemBean,
  OtherCashbackDetails,
  TargetCampaignDetails,
  TargetCampaignResponse,
  TargetListItemBean,
  WeeklyTargetCashbackResponseBean,
} from './classes/target-campaign-response.bean';
import * as moment from 'moment';
import { FranchiseOrder } from './classes/franchise-order.class';
import { CashbackWalletUpdateDto } from './dto/cashback-wallet-update.dto';
import { WalletListItemResponse } from './classes/wallet-list-item-response.class';

@ApiBasicAuth()
@Controller()
@UseFilters(HttpExceptionFilter)
export class TargetController {
  private readonly logger = new CustomLogger(TargetController.name);

  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private offerService: OfferService,
    private targetService: TargetService,
    private commonService: CommonService,
    private clientService: ClientService,
  ) {}

  @Post('targets/campaigns/upload')
  @UseInterceptors(FileInterceptor('file'))
  async targetCampaignUpload(@UploadedFile() file, @Headers('userId') userId) {
    const results = await this.commonService.readCsvData(file);
    const parsedData = this.parseTargetCampaignByHeaderMapping(results.data);
    const targetCampaignUploadBeans: ParseResult<TargetCampaignUploadBean> =
      await this.targetService.validateTargetCampaignUpload(parsedData);
    targetCampaignUploadBeans.headerMapping =
      TargetCampaignUploadBean.getHeaderMapping();
    if (targetCampaignUploadBeans.failedRows.length == 0) {
      const bulkUploadData = await this.offerService.createNewBulkUploadEntry(
        targetCampaignUploadBeans.successRows,
        'target-campaign',
        userId,
      );
      targetCampaignUploadBeans.key = bulkUploadData.accessKey;
    }
    return targetCampaignUploadBeans;
  }

  private parseTargetCampaignByHeaderMapping(csvRows) {
    const targetCampaignUploadBeans: TargetCampaignUploadBean[] = [];
    const headerMap = this.commonService.getHeaderMap(
      TargetCampaignUploadBean.getHeaderMapping(),
    );
    for (const csvRow of csvRows) {
      const processedRow = new TargetCampaignUploadBean();
      for (const key of Object.keys(csvRow)) {
        if (headerMap.has(key)) {
          processedRow[headerMap.get(key)] = csvRow[key];
        }
      }
      targetCampaignUploadBeans.push(processedRow);
    }
    return targetCampaignUploadBeans;
  }

  @Post('targets/campaigns/upload/save')
  async targetCampaignUploadSave(
    @Headers('userId') userId: string,
    @Query('key') key,
    @Query('cancel') cancel,
    @Query('targetType') targetType,
    @Query('campaignType') campaignType,
  ) {
    if (targetType == null) {
      targetType = 'WEEKLY';
    } else if (
      targetType != TargetType.WEEKLY &&
      targetType != TargetType.DAILY
    ) {
      throw new HttpException(
        { message: 'Invalid Value for Target Type' },
        HttpStatus.NOT_FOUND,
      );
    }
    if (campaignType == null) {
      campaignType = 'MOV';
    } else if (campaignType != 'MOV') {
      throw new HttpException(
        { message: 'Invalid Value for Campaign Type ' },
        HttpStatus.NOT_FOUND,
      );
    }
    const bulkUploadData = await this.offerService.getBulkUploadEntryByKey(
      'target-campaign',
      key,
    );
    if (bulkUploadData == null) {
      throw new HttpException(
        { message: 'No Bulk Upload data found for given key and module.' },
        HttpStatus.NOT_FOUND,
      );
    }
    if (cancel == null) {
      bulkUploadData.status = 1;
      await this.targetService.initiateTargetCampaigns(
        bulkUploadData.jsonData.data as TargetCampaignUploadBean[],
        targetType,
        campaignType,
        userId,
      );
      await this.offerService.saveBulkUploadData(bulkUploadData);
    } else if (cancel == 1) {
      bulkUploadData.status = 0;
      await this.offerService.saveBulkUploadData(bulkUploadData);
    } else {
      throw new HttpException(
        { message: 'Invalid input for cancel' },
        HttpStatus.NOT_FOUND,
      );
    }
    return { success: true };
  }

  @Post('targets/cron/cashback/daily')
  async runTargetCampaignCronDaily(
    @Headers('userId') userId: string,
    @Body() request: CashbackCronDto,
  ) {
    const toDate = request.date == null ? new Date() : new Date(request.date);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 9);
    const loyaltyCashbackList =
      await this.targetService.getAllPendingCashbacksBetweenDate(
        fromDate,
        toDate,
        [TargetType.DAILY],
        request.storeIds,
      );
    if (loyaltyCashbackList == null || loyaltyCashbackList.length == 0) {
      return {
        success: true,
        message: 'No Target Cashbacks Exist for the date.',
      };
    }
    const dateMap = this.buildDateMap(loyaltyCashbackList);
    const walletMap = await this.getWalletMap(
      loyaltyCashbackList.map((loyaltyCashback) => {
        return loyaltyCashback.storeId;
      }),
    );
    for (const [cashbackDate, cashbackList] of dateMap) {
      await this.processCashbacksByDate(
        cashbackDate,
        cashbackList,
        walletMap,
        userId,
      );
    }
    return { success: true, message: 'Cashbacks Processed.' };
  }

  private async processCashbacksByDate(
    cashbackDate: string,
    loyaltyCashbackList: TargetCashbackEntity[],
    walletMap: Map<string, WalletListItemResponse>,
    userId: string,
  ) {
    const ordersWithEffectivePrice =
      await this.clientService.getOrdersWithEffectivePrice(
        new Date(cashbackDate),
        loyaltyCashbackList.map((cashback) => {
          return cashback.storeId;
        }),
      );
    const campaignVouchers = await this.offerService.getCampaignVouchers(
      loyaltyCashbackList.map((cashback) => {
        return cashback.targetCampaignId;
      }),
    );
    const vouchersMap: Map<string, VoucherEntity> = new Map(
      campaignVouchers.map((voucher) => [voucher.assigned_to, voucher]),
    );
    const ordersMap: Map<string, FranchiseOrderResponseWithEffectivePrice> =
      new Map(ordersWithEffectivePrice.map((order) => [order.storeId, order]));
    await this.targetService.processDailyCashbacks(
      loyaltyCashbackList,
      ordersMap,
      vouchersMap,
      walletMap,
      userId,
    );
  }

  @Post('targets/cron/cashback/weekly')
  async runTargetCampaignCronWeekly(
    @Headers('userId') userId: string,
    @Body() request: CashbackCronDto,
  ) {
    const toDate = request.date == null ? new Date() : new Date(request.date);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 9);
    const weeklyLoyaltyCashbackList =
      await this.targetService.getAllPendingCashbacksBetweenDate(
        fromDate,
        toDate,
        [TargetType.WEEKLY],
        request.storeIds,
      );
    if (
      weeklyLoyaltyCashbackList == null ||
      weeklyLoyaltyCashbackList.length == 0
    ) {
      return {
        success: true,
        message: 'No Target Cashbacks Exist for the date.',
      };
    }
    const dailyLoyaltyCashbackList =
      await this.targetService.getAllCashbacksFromCampaignIdsAndType(
        weeklyLoyaltyCashbackList.map((cashback) => {
          return cashback.targetCampaignId;
        }),
        [TargetType.DAILY],
      );
    const dailyTargetsMap: Map<number, TargetCashbackEntity[]> =
      this.getDailyTargetMap(dailyLoyaltyCashbackList);
    await this.targetService.processWeeklyCashbacks(
      weeklyLoyaltyCashbackList,
      dailyTargetsMap,
      userId,
    );
    return { success: true };
  }

  @Get('targets/campaigns')
  async fetchAllCampaigns() {
    const loyaltyCashbackList = await this.targetService.getAllCampaigns();
    return { data: loyaltyCashbackList };
  }

  @Put('targets/campaigns/:campaign_id')
  async updateCampaign(
    @Param('campaign_id') campaignId,
    @Body() request: UpdateCampaignDto,
    @Headers('userId') userId: string,
  ) {
    const targetCampaign = await this.targetService.getCampaignById(campaignId);
    if (targetCampaign == null) {
      throw new HttpException({ message: 'Campaign Not Found.' }, 404);
    }
    if (this.isSameTargetCampaignUpdateRequest(targetCampaign, request)) {
      return { success: true, message: 'No Changes' };
    }
    const loyaltyCashbackList =
      await this.targetService.getCashbacksByCampaignId(campaignId);
    await this.disableLoyaltyCashbacks(loyaltyCashbackList, userId);
    const startEndDates = this.getStartAndEndDates(
      targetCampaign,
      loyaltyCashbackList,
    );
    targetCampaign.status = request.status;
    targetCampaign.targetAmount = request.targetAmount;
    targetCampaign.metadata.weeklyCashbackPercent =
      request.weeklyCashbackPercent;
    targetCampaign.metadata.dailyCashbackPercent = request.dailyCashbackPercent;
    await this.recheckCampaignVouchers(targetCampaign, userId);
    if (targetCampaign.status == 1) {
      const dailyTargetValue = this.targetService.getDailyTargetValue(
        targetCampaign,
        this.targetService.getDaysDiff(
          targetCampaign.startDate,
          targetCampaign.endDate,
        ),
      );
      await this.targetService.createCashbackEntriesFromCampaign(
        targetCampaign,
        startEndDates.startDate,
        startEndDates.endDate,
        dailyTargetValue,
        userId,
      );
    }
    await this.targetService.saveTargetCampaign(targetCampaign, userId);
    return { success: true, message: 'updated successfully' };
  }

  private getStartAndEndDates(
    campaign: TargetCampaignEntity,
    LoyaltyCashbackList: TargetCashbackEntity[],
  ): { startDate: Date; endDate: Date } {
    const dailyLoyaltyCashbackList = LoyaltyCashbackList.filter(
      (cashback) => cashback.targetType === TargetType.DAILY,
    );
    if (
      dailyLoyaltyCashbackList.length == 0 ||
      dailyLoyaltyCashbackList.at(0).cashback == null
    ) {
      return { startDate: campaign.startDate, endDate: campaign.endDate };
    }
    if (
      dailyLoyaltyCashbackList.at(dailyLoyaltyCashbackList.length - 1)
        .cashback != null
    ) {
      return { startDate: null, endDate: null };
    }
    let dailyStartDate = null;
    for (const loyaltyCashback of LoyaltyCashbackList) {
      if (
        loyaltyCashback.targetType == TargetType.DAILY &&
        loyaltyCashback.cashback == null
      ) {
        dailyStartDate = loyaltyCashback.cashbackDate;
        break;
      }
    }
    return { startDate: dailyStartDate, endDate: campaign.endDate };
  }
  private async recheckCampaignVouchers(
    targetCampaign: TargetCampaignEntity,
    userId: string,
  ) {
    const vouchers = await this.offerService.getAllCampaignVouchers([
      targetCampaign.id,
    ]);
    if (vouchers.length == 0) {
      await this.targetService.createDailyOfferForTargetCampaign(
        targetCampaign,
        userId,
      );
    }
    const offer = await this.targetService.createDailyOfferFromCampaignDetails(
      targetCampaign,
      userId,
    );
    for (const voucher of vouchers) {
      if (offer == null || targetCampaign.status == 0) {
        voucher.active = false;
      } else {
        voucher.offer_id = offer.id;
        voucher.active = true;
      }
      voucher.updated_by = userId;
    }
    await this.offerService.bulkSaveVouchers(vouchers);
  }

  private async disableLoyaltyCashbacks(
    cashbackList: TargetCashbackEntity[],
    userId: string,
  ) {
    cashbackList.forEach((cashback) => {
      if (cashback.cashback == null) {
        cashback.active = 0;
        cashback.modifiedBy = userId;
      }
    });
    await this.targetService.bulkSaveLoyaltyCashback(cashbackList);
  }

  private isSameTargetCampaignUpdateRequest(
    targetCampaign: TargetCampaignEntity,
    request: UpdateCampaignDto,
  ) {
    return (
      targetCampaign.targetAmount == request.targetAmount &&
      request.status == targetCampaign.status &&
      request.dailyCashbackPercent ==
        targetCampaign.metadata.dailyCashbackPercent &&
      request.weeklyCashbackPercent ==
        targetCampaign.metadata.weeklyCashbackPercent
    );
  }

  private getDailyTargetMap(dailyLoyaltyCashbackList: TargetCashbackEntity[]) {
    const dailyTargetsMap: Map<number, TargetCashbackEntity[]> = new Map();
    for (const cashback of dailyLoyaltyCashbackList) {
      if (dailyTargetsMap.has(cashback.targetCampaignId)) {
        dailyTargetsMap.get(cashback.targetCampaignId).push(cashback);
      } else {
        dailyTargetsMap.set(cashback.targetCampaignId, [cashback]);
      }
    }
    return dailyTargetsMap;
  }

  @Get('targets/store/campaign')
  async getCampaignDetailsForStore(
    @Headers('storeId') storeId: string,
    @Headers('userId') userId: string,
  ) {
    const targetCampaignResponse = new TargetCampaignResponse();
    const currentDate = this.commonService.getCurrentIstMomentDateTime();
    const campaign = await this.targetService.getCampaignByDateAndStoreId(
      storeId,
      currentDate.clone().add(1, 'days').toDate(),
    );
    if (campaign == null) {
      return targetCampaignResponse;
    }
    const dailyLoyaltyCashbackList: TargetCashbackEntity[] = [];
    let weeklyLoyaltyCashback: TargetCashbackEntity = null;
    const loyaltyCashbackList =
      await this.targetService.getCashbacksByCampaignId(campaign.id);
    for (const loyaltyCashback of loyaltyCashbackList) {
      if (loyaltyCashback.targetType == TargetType.DAILY) {
        dailyLoyaltyCashbackList.push(loyaltyCashback);
      } else if (loyaltyCashback.targetType == TargetType.WEEKLY) {
        weeklyLoyaltyCashback = loyaltyCashback;
      }
    }
    targetCampaignResponse.targetCampaignDetails =
      this.buildTargetCampaignDetails(campaign);
    if (dailyLoyaltyCashbackList.length > 0) {
      targetCampaignResponse.dailyTargetCashbackDetails =
        await this.buildDailyLoyaltyCashbackResponseBean(
          dailyLoyaltyCashbackList,
          storeId,
          currentDate,
        );
    }
    if (weeklyLoyaltyCashback != null) {
      targetCampaignResponse.weeklyTargetCashbackDetails =
        this.buildWeeklyLoyaltyCashbackResponseBean(
          weeklyLoyaltyCashback,
          targetCampaignResponse,
        );
    }
    if (campaign.metadata.dailyCashbackPercent == 0) {
      targetCampaignResponse.dailyTargetCashbackDetails = null;
    }
    await this.addOtherCashbackDetails(targetCampaignResponse);
    return targetCampaignResponse;
  }

  private buildDailyTargetListItemResponse(
    dailyLoyaltyCashback: TargetCashbackEntity,
    franchiseCart: FranchiseOrder,
    previousOrder: FranchiseOrderResponseWithEffectivePrice,
    currentDate: moment.Moment,
  ) {
    const dailyCashbackListBean: DailyTargetListItemBean =
      this.commonService.mapper(
        dailyLoyaltyCashback,
        new TargetListItemBean(),
        false,
      );
    Object.assign(dailyCashbackListBean, dailyLoyaltyCashback.metadata);
    dailyCashbackListBean.targetAmount = this.commonService.convertToNumber(
      dailyCashbackListBean.targetAmount,
    );
    dailyCashbackListBean.cashback = this.commonService.convertToNumber(
      dailyCashbackListBean.cashback,
    );
    dailyCashbackListBean.cashbackPercent = this.commonService.convertToNumber(
      dailyCashbackListBean.cashbackPercent,
    );
    if (
      currentDate
        .clone()
        .add(1, 'days')
        .isSame(moment(dailyLoyaltyCashback.cashbackDate), 'day')
    ) {
      dailyCashbackListBean.qualifierOrderBillAmount =
        franchiseCart != null ? franchiseCart.spGrossAmountWithoutBulkSkus : 0;
      dailyCashbackListBean.dailyCashbackStatus = 'CURRENT';
    } else if (
      currentDate
        .clone()
        .isSame(moment(dailyLoyaltyCashback.cashbackDate), 'day') &&
      dailyLoyaltyCashback.cashback == null
    ) {
      dailyCashbackListBean.qualifierOrderBillAmount =
        previousOrder != null ? previousOrder.spGrossAmountWithoutBulkSkus : 0;
      dailyCashbackListBean.dailyCashbackStatus = 'IN_PROCESS';
    } else if (dailyLoyaltyCashback.cashback == 0) {
      dailyCashbackListBean.dailyCashbackStatus = 'FAILED';
    } else if (dailyLoyaltyCashback.cashback == null) {
      dailyCashbackListBean.dailyCashbackStatus = 'LOCKED';
    } else {
      dailyCashbackListBean.dailyCashbackStatus = 'EARNED';
    }
    return dailyCashbackListBean;
  }

  private async buildDailyLoyaltyCashbackResponseBean(
    dailyLoyaltyCashbackList: TargetCashbackEntity[],
    storeId: string,
    currentDate: moment.Moment,
  ) {
    const franchiseCart =
      await this.clientService.getFranchiseCartFromInternalCall(storeId);
    const todayDeliveredOrder = await this.getTodayDeliveredOrderByDate(
      storeId,
      currentDate,
    );
    const dailyLoyaltyCashbackDetails = new DailyTargetCashbackResponseBean();
    dailyLoyaltyCashbackDetails.currentQualifierAmount =
      franchiseCart != null ? franchiseCart.spGrossAmountWithoutBulkSkus : 0;
    for (const dailyLoyaltyCashback of dailyLoyaltyCashbackList) {
      const dailyLoyaltyCashbackListItemBean =
        this.buildDailyTargetListItemResponse(
          dailyLoyaltyCashback,
          franchiseCart,
          todayDeliveredOrder,
          currentDate,
        );
      if (dailyLoyaltyCashbackListItemBean.dailyCashbackStatus == 'CURRENT') {
        dailyLoyaltyCashbackDetails.todayTargetAmount =
          dailyLoyaltyCashbackListItemBean.targetAmount;
        dailyLoyaltyCashbackDetails.todayRemainingTargetAmount =
          dailyLoyaltyCashbackDetails.todayTargetAmount <
          dailyLoyaltyCashbackDetails.currentQualifierAmount
            ? 0
            : dailyLoyaltyCashbackDetails.todayTargetAmount -
              dailyLoyaltyCashbackDetails.currentQualifierAmount;
        dailyLoyaltyCashbackDetails.todayTargetCompletionPercentage =
          ((dailyLoyaltyCashbackDetails.todayTargetAmount -
            dailyLoyaltyCashbackDetails.todayRemainingTargetAmount) /
            dailyLoyaltyCashbackDetails.todayTargetAmount) *
          100;
      }
      dailyLoyaltyCashbackDetails.targetList.push(
        dailyLoyaltyCashbackListItemBean,
      );
    }
    return dailyLoyaltyCashbackDetails;
  }

  private buildWeeklyLoyaltyCashbackResponseBean(
    weeklyLoyaltyCashback: TargetCashbackEntity,
    targetCampaignResponse: TargetCampaignResponse,
  ) {
    const weeklyLoyaltyCashbackBean: WeeklyTargetCashbackResponseBean =
      this.commonService.mapper(
        weeklyLoyaltyCashback,
        new WeeklyTargetCashbackResponseBean(),
        false,
      );
    weeklyLoyaltyCashbackBean.targetAmount = this.commonService.convertToNumber(
      weeklyLoyaltyCashbackBean.targetAmount,
    );
    weeklyLoyaltyCashbackBean.cashbackPercent =
      this.commonService.convertToNumber(
        weeklyLoyaltyCashbackBean.cashbackPercent,
      );
    weeklyLoyaltyCashbackBean.totalQualifierAmount = 0;
    if (
      targetCampaignResponse.dailyTargetCashbackDetails != null &&
      targetCampaignResponse.dailyTargetCashbackDetails.targetList != null
    ) {
      for (const dailyTarget of targetCampaignResponse
        .dailyTargetCashbackDetails.targetList) {
        weeklyLoyaltyCashbackBean.totalQualifierAmount +=
          dailyTarget.qualifierOrderBillAmount != null
            ? dailyTarget.qualifierOrderBillAmount
            : 0;
      }
    }
    weeklyLoyaltyCashbackBean.remainingTargetAmount =
      weeklyLoyaltyCashbackBean.targetAmount <
      weeklyLoyaltyCashbackBean.totalQualifierAmount
        ? 0
        : weeklyLoyaltyCashbackBean.targetAmount -
          weeklyLoyaltyCashbackBean.totalQualifierAmount;
    weeklyLoyaltyCashbackBean.targetCompletionPercentage =
      ((weeklyLoyaltyCashbackBean.targetAmount -
        weeklyLoyaltyCashbackBean.remainingTargetAmount) /
        weeklyLoyaltyCashbackBean.targetAmount) *
      100;
    return weeklyLoyaltyCashbackBean;
  }

  private async addOtherCashbackDetails(
    targetCampaignResponse: TargetCampaignResponse,
  ) {
    targetCampaignResponse.otherCashbackDetails = new OtherCashbackDetails();
    if (targetCampaignResponse.weeklyTargetCashbackDetails != null) {
      targetCampaignResponse.otherCashbackDetails.monthlyPotentialCashback =
        (targetCampaignResponse.weeklyTargetCashbackDetails.cashbackPercent *
          targetCampaignResponse.weeklyTargetCashbackDetails.targetAmount *
          4) /
        100;
    }
    targetCampaignResponse.otherCashbackDetails.currentMonthTotalEarning =
      await this.targetService.getMonthlyEarningByStoreId(
        targetCampaignResponse.targetCampaignDetails.storeId,
      );
    targetCampaignResponse.otherCashbackDetails.lifetimeTotalEarning =
      await this.targetService.getLifetimeEarningByStoreId(
        targetCampaignResponse.targetCampaignDetails.storeId,
      );
    targetCampaignResponse.otherCashbackDetails.rules = [
      'Cashback आपके Sorted Wallet में दिया जाएगा',
      'आपके target में bulk item - आलू के कट्टे (२०० किलो से ऊपर ) , प्याज़ के कट्टे (२०० किलो से ऊपर ) और नारियल (२०० किलो से ऊपर ) को मान्यता नहीं दी जाएगी',
      'Cashback आपको आपके Net applicable या बिल से रिफंड व बल्क आइटम के कुल को हटा कर दिया जाएगा',
      'Cashback आपको delivery के दिन सभी रिफंड निकलने के बाद दिया जाएगा',
      'Cashback आपके बिल का कुछ प्रतिशत होगा जिसकी जानकारी आपको सप्ताह के शुरुआत में दे दी जाएगी',
    ];
    targetCampaignResponse.otherCashbackDetails.info =
      'इस स्कीम के तहत हर partner को एक दैनिक और साप्ताहिक target दिया जायेगा।  Target आपके मौजूदा sales को ध्यान में रख कर बनाया जायेगा।  यदि आप अपने रोज़ाना के targets को पूरा करने में सफल होते हैं तो आपको guaranteed cashback मिलेगा।  और अगर आप एक कदम आगे बढ़कर अपने साप्ताहिक target को भी पूरा करते हैं तो आपको  extra cashback भी मिलेगा।';
    targetCampaignResponse.otherCashbackDetails.footer =
      'हम समझते हैं आपकी जरूरतों को और हमेशा प्रयास करते हैं की यह साझेदारी आपके और आपके व्यापर के लिए हमेशा लाभदायक हो |Sorted  का लक्ष्य देश भर के फल सब्ज़ी विक्रेताओं को सक्षम और सफल बनाना है और इस लक्ष्य को पाने के लिए यह हमारी छोटी सी पहल है !\n\n-Sorted के संस्थापक';
  }

  private async getTodayDeliveredOrderByDate(
    storeId: string,
    currentDate: moment.Moment,
  ) {
    const todayDeliveredOrder =
      await this.clientService.getOrdersWithEffectivePrice(
        currentDate.toDate(),
        [storeId],
      );
    return todayDeliveredOrder.length > 0 ? todayDeliveredOrder.at(0) : null;
  }

  private buildTargetCampaignDetails(campaign: TargetCampaignEntity) {
    const targetCampaignDetails: TargetCampaignDetails =
      this.commonService.mapper(campaign, new TargetCampaignDetails(), false);
    targetCampaignDetails.targetAmount = Number(
      targetCampaignDetails.targetAmount,
    );
    return targetCampaignDetails;
  }

  @Post('targets/cashback/wallet-eligible')
  async markCashbacksWalletEligible(@Body() request: CashbackWalletUpdateDto) {
    const toDate =
      request.walletEligibilityDate == null
        ? new Date()
        : new Date(request.walletEligibilityDate);
    const fromDate = new Date();
    fromDate.setDate(toDate.getDate() - 9);
    const dailyLoyaltyCashbacks =
      await this.targetService.getAllPendingCashbacksBetweenDate(
        fromDate,
        toDate,
        [TargetType.DAILY],
        request.storeIds,
      );
    if (dailyLoyaltyCashbacks == null || dailyLoyaltyCashbacks.length == 0) {
      return {
        success: true,
        message: 'No Target Cashbacks Exist for the date.',
      };
    }
    for (const dailyLoyaltyCashback of dailyLoyaltyCashbacks) {
      dailyLoyaltyCashback.metadata.isWalletEligible = true;
    }
    await this.targetService.bulkSaveLoyaltyCashback(dailyLoyaltyCashbacks);
    return { success: true };
  }

  private buildDateMap(loyaltyCashbackList: TargetCashbackEntity[]) {
    const dateMap = new Map<string, TargetCashbackEntity[]>();
    for (const loyaltyCashback of loyaltyCashbackList) {
      const cashbackDate = moment(loyaltyCashback.cashbackDate)
        .add(5, 'hours')
        .add(31, 'minutes')
        .toDate()
        .toISOString()
        .slice(0, 10);
      if (dateMap.has(cashbackDate)) {
        dateMap.get(cashbackDate).push(loyaltyCashback);
      } else {
        dateMap.set(cashbackDate, [loyaltyCashback]);
      }
    }
    return dateMap;
  }

  private async getWalletMap(storeIds: string[]) {
    const walletList = await this.clientService.fetchStoreWalletsInternal(
      storeIds,
    );
    const walletMap = new Map<string, WalletListItemResponse>();
    for (const wallet of walletList) {
      walletMap.set(wallet.entityId, wallet);
    }
    return walletMap;
  }
}
