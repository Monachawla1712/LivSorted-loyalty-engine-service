import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  FindOptionsWhere,
  In,
  IsNull,
  LessThan,
  MoreThan,
  Repository,
} from 'typeorm';
import { OfferEntity } from './entity/offers.entity';
import { VoucherEntity } from './entity/vouchers.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ApplicableFor } from './enum/applicable-for.enum';
import { VoucherType } from './enum/voucher-type.enum';
import { Engine, Rule, RuleProperties } from 'json-rules-engine';
import { ConditionType } from './enum/condition-type.enum';
import { OfferResponse } from './classes/offer-response.class';
import { OfferLevel } from './enum/offer-level.enum';
import { SkuDiscount } from './classes/sku-discount.class';
import { OrderLevel } from './classes/order-level.class';
import { OfferDetails } from './classes/offer-details.class';
import { ModifiedOrderItem } from './classes/modified-order-item.class';
import { DiscountType } from './enum/discount-type.enum';
import {
  CashbackDetails,
  FranchiseOfferResponse,
  FranchiseSkuDiscount,
} from './classes/franchise-offer-response.class';
import { ModifiedFranchiseOrderItem } from './classes/modified-franchise-order-item.class';
import {
  FranchiseOrder,
  FranchiseOrderItem,
} from './classes/franchise-order.class';
import { OfferType } from './enum/offer-type.enum';
import { BulkUploadEntity } from './entity/bulk-upload.entity';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { Order } from './classes/order.class';

@Injectable()
export class OfferService {
  private readonly logger = new CustomLogger(OfferService.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    @InjectRepository(OfferEntity)
    private readonly offerRepository: Repository<OfferEntity>,
    @InjectRepository(VoucherEntity)
    private readonly voucherRepository: Repository<VoucherEntity>,
    @InjectRepository(BulkUploadEntity)
    private readonly bulkUploadRepository: Repository<BulkUploadEntity>,
    private rulesEngine: Engine,
  ) {}

  async getAllOffersAdmin() {
    return await this.offerRepository.find();
  }

  getRulesFromOffer(offer: OfferEntity): Rule {
    let conditionObject = null;

    if (offer.rules.type == ConditionType.ANY) {
      conditionObject = { any: offer.rules.conditions };
    } else {
      conditionObject = { all: offer.rules.conditions };
    }

    const rulesObject: Rule = new Rule({
      name: 'EngineRule',
      conditions: conditionObject,
      event: offer.rules.event,
    });

    return rulesObject;
  }

  async validateCoupon(
    voucher: VoucherEntity,
    offer: OfferEntity,
    order: Order,
  ): Promise<OfferResponse> {
    const ruleName = 'EngineRule';
    const rulesObject: Rule = this.buildRulesObject(offer, ruleName);
    this.rulesEngine.addRule(rulesObject);

    const offerResponse = new OfferResponse();
    offerResponse.offerDetails = new OfferDetails(offer, voucher);
    offerResponse.orderLevel = null;
    offerResponse.skuLevel = null;

    let offerAppliedFlag = false;

    if (offer.offer_application_rules.event.type == OfferType.ORDERLEVEL) {
      const event = await this.rulesEngine.run(order);
      if (event.events.length) {
        offerResponse.orderLevel = new OrderLevel();
        offerResponse.orderLevel.discountType = offer.discount_type;
        offerResponse.orderLevel.discountValue = offer.discount_value;
        if (offer.max_limit != null) {
          const discValue =
            (order.finalBillAmount * offer.discount_value) / 100;
          if (discValue > offer.max_limit) {
            offerResponse.orderLevel.discountType = DiscountType.FLAT;
            offerResponse.orderLevel.discountValue = offer.max_limit;
          }
        }
        offerAppliedFlag = true;
      }
    } else if (
      offer.offer_application_rules.event.type == OfferLevel.ORDERITEM
    ) {
      offerResponse.skuLevel = [];
      for (const orderItem of order.orderItems) {
        const modifiedOrderItem = new ModifiedOrderItem(orderItem, order);
        const event = await this.rulesEngine.run(modifiedOrderItem);
        if (event.events.length) {
          const skuDiscount = new SkuDiscount();
          skuDiscount.skuCode = orderItem.skuCode;
          skuDiscount.discountType = offer.discount_type;
          skuDiscount.discountAmount = offer.discount_value;
          offerAppliedFlag = true;
          offerResponse.skuLevel.push(skuDiscount);
        }
      }
    } else {
      this.rulesEngine.removeRule(ruleName);
      throw new HttpException(
        { message: 'Voucher Level and Type are conflicting.' },
        HttpStatus.CONFLICT,
      );
    }
    this.rulesEngine.removeRule(ruleName);
    if (offerAppliedFlag == false) {
      throw new HttpException({ message: 'Voucher Cannot be Applied' }, 420);
    }
    return offerResponse;
  }

  async getVouchersFromUserAndStoreId(
    storeId: string,
    customerId: string,
    oldVoucher: string,
    voucherFor: string,
    isAutoApplicable: boolean,
  ): Promise<VoucherEntity[]> {
    const whereArray: FindOptionsWhere<VoucherEntity>[] =
      this.BuildOfferFiltersArray(
        storeId,
        customerId,
        oldVoucher,
        voucherFor,
        isAutoApplicable,
      );
    return await this.voucherRepository.find({
      where: whereArray,
      relations: ['offer'],
    });
  }

  private BuildOfferFiltersArray(
    storeId: string,
    customerId: string,
    oldVoucher: string,
    voucherFor: string,
    isAutoApplicable: boolean,
  ) {
    const offerJoinOption: FindOptionsWhere<OfferEntity> = {
      active: true,
      offer_start: LessThan(new Date(Date.now())),
      offer_end: MoreThan(new Date(Date.now())),
      ...(isAutoApplicable == null ? {} : { is_auto_applicable: true }),
    };
    const whereArray: FindOptionsWhere<VoucherEntity>[] = [];
    whereArray.push({
      applicable_for: ApplicableFor.ALL,
      is_public: true,
      voucher_for: voucherFor,
      offer: offerJoinOption,
      active: true,
    });
    if (storeId != null) {
      whereArray.push({
        assigned_to: storeId,
        voucher_for: voucherFor,
        offer: offerJoinOption,
        is_public: true,
        active: true,
      });
    }
    if (customerId != null) {
      whereArray.push({
        assigned_to: customerId,
        voucher_type: VoucherType.DYNAMIC,
        is_redeemed: false,
        is_public: true,
        voucher_for: voucherFor,
        offer: offerJoinOption,
        active: true,
      });
    }
    if (oldVoucher != null) {
      whereArray.push({
        code: oldVoucher,
        voucher_for: voucherFor,
        offer: offerJoinOption,
        active: true,
      });
    }
    return whereArray;
  }
  async checkOfferApplicable(order, offer: OfferEntity): Promise<boolean> {
    const rulesObject = new Rule({
      name: 'EngineRule',
      conditions: offer.offer_application_rules.conditions,
      event: offer.offer_application_rules.event,
    });
    this.rulesEngine.addRule(rulesObject);
    if (offer.offer_application_rules.event.type == OfferType.ORDERLEVEL) {
      const event = await this.rulesEngine.run(order);
      if (event.events.length) {
        this.rulesEngine.removeRule('EngineRule');
        return true;
      }
    } else {
      let offerAppliedSkuCount = 0;
      for (const orderItem of order.orderItems) {
        const modifiedOrderItem = new ModifiedFranchiseOrderItem(
          orderItem,
          order,
          offerAppliedSkuCount,
        );
        const event = await this.rulesEngine.run(modifiedOrderItem);
        if (event.events.length) {
          offerAppliedSkuCount += 1;
          this.rulesEngine.removeRule('EngineRule');
          return true;
        }
      }
    }
    this.rulesEngine.removeRule('EngineRule');
    return false;
  }

  async saveOffer(offer: OfferEntity) {
    return this.offerRepository.save(offer);
  }

  async getVoucherFromCode(voucherCode: string, storeId, voucherFor: string) {
    const whereArray: FindOptionsWhere<VoucherEntity>[] = [];
    whereArray.push({
      code: voucherCode,
      voucher_for: voucherFor,
      assigned_to: storeId,
      applicable_for: ApplicableFor.ASSIGNED,
      active: true,
    });
    whereArray.push({
      code: voucherCode,
      voucher_for: voucherFor,
      applicable_for: ApplicableFor.ALL,
      active: true,
    });
    return this.voucherRepository.findOne({
      where: whereArray,
    });
  }

  async getOfferFromId(offer_id: string) {
    return this.offerRepository.findOne({
      where: {
        id: offer_id,
        offer_start: LessThan(new Date(Date.now())),
        offer_end: MoreThan(new Date(Date.now())),
        active: true,
      },
    });
  }

  async validateOfferFranchise(
    voucher: VoucherEntity,
    offer: OfferEntity,
    order: FranchiseOrder,
  ): Promise<FranchiseOfferResponse> {
    const ruleName = 'EngineRule';
    const rulesObject: Rule = this.buildRulesObject(offer, ruleName);
    this.rulesEngine.addRule(rulesObject);
    const offerResponse = this.createOfferResponse(voucher, offer);
    let offerAppliedFlag = false;
    if (offer.offer_application_rules.event.type == OfferType.ORDERLEVEL) {
      const event = await this.rulesEngine.run(order);
      if (event.events.length) {
        if (offer.offer_level == OfferLevel.CASHBACK) {
          offerResponse.cashbackDetails = this.getOfferCashbackDetails(offer);
        } else if (offer.offer_level == OfferLevel.ORDER) {
          offerResponse.orderLevel = this.getOrderLevelOfferDetails(
            offer,
            order,
          );
        }
        offerAppliedFlag = true;
      }
    } else if (
      offer.offer_application_rules.event.type == OfferType.ITEMLEVEL
    ) {
      offerResponse.skuLevel = [];
      let offerAppliedSkuCount = 0;
      for (const orderItem of order.orderItems) {
        const modifiedOrderItem = new ModifiedFranchiseOrderItem(
          orderItem,
          order,
          offerAppliedSkuCount,
        );
        const event = await this.rulesEngine.run(modifiedOrderItem);
        if (event.events.length) {
          offerAppliedSkuCount += 1;
          const skuDiscount = this.getItemLevelOfferDetails(offer, orderItem);
          offerAppliedFlag = true;
          offerResponse.skuLevel.push(skuDiscount);
        }
      }
    } else {
      this.rulesEngine.removeRule(ruleName);
      throw new HttpException(
        { message: 'Voucher Level and Type are conflicting.' },
        HttpStatus.CONFLICT,
      );
    }
    this.rulesEngine.removeRule(ruleName);
    if (offerAppliedFlag == false) {
      throw new HttpException({ message: 'Voucher Cannot be Applied' }, 420);
    }
    return offerResponse;
  }

  async getAllOffers() {
    return await this.offerRepository.find({ where: { active: true } });
  }

  async checkViewOfferApplicable(cart, voucher: VoucherEntity) {
    try {
      if (
        voucher == null ||
        voucher.offer == null ||
        voucher.offer.offer_view_rules == null
      ) {
        return true;
      }
      const rulesObject: Rule = new Rule({
        name: 'EngineViewRule',
        conditions: voucher.offer.offer_view_rules,
        event: { type: 'ORDERLEVEL', params: {} },
      });
      this.rulesEngine.addRule(rulesObject);
      const event = await this.rulesEngine.run(cart);
      if (event.events.length) {
        this.rulesEngine.removeRule('EngineViewRule');
        return true;
      }
      this.rulesEngine.removeRule('EngineViewRule');
      return false;
    } catch (e) {
      return false;
    }
  }

  async upsertVouchers(vouchers: VoucherEntity[], userId) {
    try {
      return await this.voucherRepository.upsert(
        vouchers.map((voucher) => {
          return {
            ...voucher,
            userId: userId,
          };
        }),
        {
          skipUpdateIfNoValuesChanged: true,
          conflictPaths: ['code', 'assigned_to'],
        },
      );
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while saving offers',
        e,
      );
      throw new HttpException(
        { message: e.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async saveOffers(offers: OfferEntity[], userId: string) {
    try {
      return await this.offerRepository.upsert(
        offers.map((offer) => {
          return {
            ...offer,
            userId: userId,
          };
        }),
        {
          skipUpdateIfNoValuesChanged: true,
          conflictPaths: ['offer_name'],
        },
      );
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while saving offers',
        e,
      );
      throw new HttpException(
        { message: e.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getOfferFromOfferNames(offerNamesList: string[]) {
    return await this.offerRepository.find({
      where: { offer_name: In(offerNamesList) },
    });
  }

  async getBulkUploadEntryByKey(module: string, accessKey: string) {
    return this.bulkUploadRepository.findOne({
      where: { accessKey: accessKey, module: module, status: IsNull() },
    });
  }

  async createNewBulkUploadEntry(
    data: object[],
    module: string,
    userId: string,
  ) {
    const bulkUploadEntity = new BulkUploadEntity(data, module, userId);
    return this.bulkUploadRepository.save(bulkUploadEntity);
  }

  saveBulkUploadData(bulkUploadData: BulkUploadEntity) {
    return this.bulkUploadRepository.save(bulkUploadData);
  }

  private createOfferResponse(voucher: VoucherEntity, offer: OfferEntity) {
    const offerResponse = new FranchiseOfferResponse();
    offerResponse.voucher = voucher.code;
    offerResponse.offerId = offer.id;
    offerResponse.offerType = offer.offer_level;
    offerResponse.offerTitle = offer.title;
    return offerResponse;
  }

  private calculateOrderDiscount(offer: OfferEntity, order: FranchiseOrder) {
    let discount = 0;
    if (offer.discount_type == DiscountType.FLAT) {
      discount = offer.discount_value;
    } else if (offer.discount_type == DiscountType.PERCENT) {
      discount = (offer.discount_value * order.totalSpGrossAmount) / 100;
    }
    discount =
      offer.max_limit != null ? Math.min(discount, offer.max_limit) : discount;
    return discount;
  }

  private calculateItemDiscount(
    offer: OfferEntity,
    orderItem: FranchiseOrderItem,
  ) {
    let discount = 0;
    if (offer.discount_type == DiscountType.FLAT) {
      discount = offer.discount_value;
    } else if (offer.discount_type == DiscountType.PERCENT) {
      discount = (offer.discount_value * orderItem.spGrossAmount) / 100;
    }
    discount =
      offer.max_limit != null ? Math.min(discount, offer.max_limit) : discount;
    return discount;
  }

  private buildRulesObject(offer: OfferEntity, ruleName: string) {
    return new Rule({
      name: ruleName,
      conditions: offer.offer_application_rules.conditions,
      event: offer.offer_application_rules.event,
    });
  }

  private getOfferCashbackDetails(offer: OfferEntity) {
    const cashbackDetails = new CashbackDetails();
    if (offer.discount_type == DiscountType.PERCENT) {
      cashbackDetails.cashbackPercent = offer.discount_value;
    } else if (offer.discount_type == DiscountType.FLAT) {
      cashbackDetails.cashbackAmount = offer.discount_value;
    }
    return cashbackDetails;
  }

  private getOrderLevelOfferDetails(offer: OfferEntity, order: FranchiseOrder) {
    const orderLevel = new OrderLevel();
    orderLevel.discountValue = this.calculateOrderDiscount(offer, order);
    return orderLevel;
  }

  private getItemLevelOfferDetails(
    offer: OfferEntity,
    orderItem: FranchiseOrderItem,
  ) {
    const skuDiscount = new FranchiseSkuDiscount();
    skuDiscount.skuCode = orderItem.skuCode;
    skuDiscount.discountValue = this.calculateItemDiscount(offer, orderItem);
    return skuDiscount;
  }

  async getCampaignVouchers(campaignIds: number[]) {
    return await this.voucherRepository.find({
      where: { campaign_id: In(campaignIds), active: true },
    });
  }

  async getAllCampaignVouchers(campaignIds: number[]) {
    return await this.voucherRepository.find({
      where: { campaign_id: In(campaignIds) },
    });
  }

  async bulkSaveVouchers(vouchers: VoucherEntity[]) {
    await this.voucherRepository.save(vouchers);
  }

  async createNewOffer(
    terms: string,
    title: string,
    startDate: Date,
    endDate: Date,
    maxLimit: number,
    discountType: DiscountType,
    discountValue: number,
    rules: RuleProperties,
    offerName: string,
    offerLevel: string,
    isAutoApplicable: boolean,
    createdBy: string,
  ) {
    const offer = OfferEntity.createNewOfferEntity(
      terms,
      title,
      startDate,
      endDate,
      maxLimit,
      discountType,
      discountValue,
      rules,
      offerName,
      offerLevel,
      isAutoApplicable,
      createdBy,
    );
    return await this.offerRepository.save(offer);
  }

  async createNewVoucher(
    offerId: string,
    voucherName: string,
    assignedTo: string,
    voucherFor: string,
    voucherType: VoucherType,
    applicableFor: ApplicableFor,
    isPublic: boolean,
    targetCampaignId: number,
    userId: string,
  ) {
    const voucher = VoucherEntity.createNewVoucherEntity(
      offerId,
      voucherName,
      assignedTo,
      voucherFor,
      voucherType,
      applicableFor,
      isPublic,
      targetCampaignId,
      userId,
    );
    return await this.voucherRepository.save(voucher);
  }
}
