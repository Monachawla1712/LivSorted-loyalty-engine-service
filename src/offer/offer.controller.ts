import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { OfferService } from './offer.service';
import { ApiBasicAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { CreateOfferDto } from './dto/create-offer.dto';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { OfferEntity } from './entity/offers.entity';
import { OfferResponse } from './classes/offer-response.class';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { Order } from './classes/order.class';
import { FetchStoreOffersDto } from './dto/fetch-store-offers.dto';
import { VoucherEntity } from './entity/vouchers.entity';
import { VoucherListBean } from './classes/voucher-list.bean';
import { CommonService } from '../core/common/common.service';
import { FranchiseValidateCouponDto } from './dto/franchise-validate-coupon.dto';
import { FranchiseOfferResponse } from './classes/franchise-offer-response.class';
import { FranchiseOrder } from './classes/franchise-order.class';
import { Readable } from 'stream';
import { FileInterceptor } from '@nestjs/platform-express';
import { parse } from 'papaparse';
import { FranchiseOrderDetailsDto } from './dto/franchise-order-details.dto';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { ClientService } from './client.service';

@ApiTags('Offers')
@ApiBasicAuth()
@Controller()
@UseFilters(HttpExceptionFilter)
export class OfferController {
  private readonly logger = new CustomLogger(OfferController.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private offerService: OfferService,
    private clientService: ClientService,
    private commonService: CommonService,
  ) {}

  @Post('create')
  async createOffer(
    @Headers('storeId') storeId: string,
    @Headers('userId') userId: string,
    @Headers('appId') appId: string,
    @Body() createOfferDto: CreateOfferDto,
  ): Promise<OfferEntity> {
    let offer = OfferEntity.createNewOfferFromDto(createOfferDto, userId);
    offer = await this.offerService.saveOffer(offer);
    return offer;
  }

  @Post('voucher/create')
  async createVoucher(
    @Headers('storeId') storeId,
    @Headers('userId') userId,
    @Headers('appId') appId,
    @Body() createVoucherDto: CreateVoucherDto,
  ) {
    let success = true;
    let message = 'Vouchers created.';
    try {
      const vouchers: VoucherEntity[] = [];
      for (const entityId of createVoucherDto.assigned_to) {
        const voucher = VoucherEntity.createNewVoucherFromDto(
          createVoucherDto,
          entityId,
          userId,
        );
        vouchers.push(voucher);
      }
      await this.offerService.upsertVouchers(vouchers, userId);
    } catch (e) {
      success = false;
      if (e.constructor.name == 'QueryFailedError') {
        if (e.code == '23503') {
          message = 'Offer does not exist.';
        }
        if (
          e.code == '23505' &&
          e.constraint == 'unique_offer_entity_mapping'
        ) {
          message = 'Some Stores with this offer already exists.';
        }
      }
    }
    return { success: success, message: message };
  }

  @Post('admin/offers')
  async fetchOffersAdmin() {
    const userOffers = await this.offerService.getAllOffers();
    return userOffers;
  }

  @Post(['fetch', 'store/fetch'])
  async fetchOffersForStore(
    @Headers('storeId') storeId,
    @Headers('userId') userId,
    @Headers('appId') appId,
    @Body() fetchStoreOffersDto: FetchStoreOffersDto,
  ) {
    const cart: Order = await this.clientService.getCartFromInternalCall(
      fetchStoreOffersDto.customerId,
    );
    this.noCartError(cart);
    const oldVoucher = this.commonService.isPosRequest(appId)
      ? null
      : this.getOldVoucherFromCart(cart);
    const offers = await this.offerService.getVouchersFromUserAndStoreId(
      storeId,
      fetchStoreOffersDto.customerId,
      oldVoucher,
      'CONSUMER',
      null,
    );
    const offersList = await this.getVouchersList(offers, cart);
    return { offers: offersList };
  }

  private async getVouchersList(vouchers: VoucherEntity[], cart) {
    const response: VoucherListBean[] = [];
    for (const voucher of vouchers) {
      if (
        (await this.offerService.checkViewOfferApplicable(cart, voucher)) ==
        false
      ) {
        continue;
      }
      const voucherListItem: VoucherListBean = this.commonService.mapper(
        voucher,
        new VoucherListBean(),
        false,
      );
      voucherListItem.isOfferApplicable =
        (await this.offerService.checkOfferApplicable(cart, voucher.offer)) ===
        true;
      response.push(voucherListItem);
    }
    return response;
  }

  @Post('internal/validate')
  @ApiResponse({ type: OfferResponse })
  async validateCoupon(
    @Headers('userId') userId,
    @Body() validateCouponDto: ValidateCouponDto,
  ): Promise<OfferResponse> {
    const order: Order = validateCouponDto.order;
    const voucher = await this.offerService.getVoucherFromCode(
      validateCouponDto.code,
      null,
      'CONSUMER',
    );
    if (voucher == null) {
      throw new HttpException({ message: 'Voucher Not Found' }, 404);
    }
    const offer = await this.offerService.getOfferFromId(voucher.offer_id);
    return await this.offerService.validateCoupon(voucher, offer, order);
  }

  @Get('get-all')
  async getAllOffersAdmin() {
    const allOffers = await this.offerService.getAllOffersAdmin();
    return allOffers;
  }

  private noCartError(cart) {
    if (cart == null) {
      throw new HttpException({ message: 'Cart does not exist' }, 400);
    }
  }

  private getOldVoucherFromCart(cart) {
    let oldVoucher = null;
    if (cart != null && cart.offerData != null) {
      if (
        cart.offerData.voucherCode != null &&
        cart.offerData.isOfferApplied == true
      ) {
        oldVoucher = cart.offerData.voucherCode;
      }
    }
    return oldVoucher;
  }

  @Get('franchise/fetch')
  async fetchOffersForFranchiseStore(@Headers('storeId') storeId) {
    let cart: FranchiseOrder =
      await this.clientService.getFranchiseCartFromInternalCall(storeId);
    this.noCartError(cart);
    if (cart == null) {
      cart = new FranchiseOrder();
    }
    const oldVoucher = this.getOldVoucherFromCart(cart);
    const store = await this.clientService.getStoreFromId(storeId);
    cart['daysSinceStoreCreated'] =
      store != null ? store.daysSinceCreation : null;
    const offers = await this.offerService.getVouchersFromUserAndStoreId(
      storeId,
      null,
      oldVoucher,
      'FRANCHISE',
      null,
    );
    const offersList = await this.getVouchersList(offers, cart);
    return { offers: offersList };
  }

  @Post('internal/franchise/validate')
  @ApiResponse({ type: OfferResponse })
  async validateCouponFranchise(
    @Headers('userId') userId,
    @Body() validateCouponDto: FranchiseValidateCouponDto,
  ): Promise<FranchiseOfferResponse> {
    let order: FranchiseOrder = null;
    if (validateCouponDto.order !== null) {
      order = validateCouponDto.order;
    } else {
      order = await this.clientService.getFranchiseOrderFromInternalCall(
        validateCouponDto.orderId,
      );
    }
    const store = await this.clientService.getStoreFromId(order.storeId);
    order['daysSinceStoreCreated'] =
      store != null ? store.daysSinceCreation : null;
    const voucher = await this.offerService.getVoucherFromCode(
      validateCouponDto.code,
      validateCouponDto.storeId,
      'FRANCHISE',
    );
    if (voucher == null) {
      throw new HttpException(
        { message: 'Voucher not found.' },
        HttpStatus.NOT_FOUND,
      );
    }
    const offer = await this.offerService.getOfferFromId(voucher.offer_id);
    if (offer == null) {
      throw new HttpException(
        { message: 'Offer does not exist or expired.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.offerService.validateOfferFranchise(
      voucher,
      offer,
      order,
    );
  }

  @Post('admin/offers/bulk-upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadOffersSheet(@UploadedFile() file, @Headers('userId') userId) {
    const fileBufferInBase64: string = file.buffer.toString('base64');
    const buffer = Buffer.from(fileBufferInBase64, 'base64');
    const dataStream = Readable.from(buffer);
    const results = await this.readCSVData(dataStream);
    const attributes = ['offer_name'];
    const missingHeader = this.checkMissingHeader(
      attributes,
      new Set(results.meta.fields as string[]),
    );
    if (missingHeader != null) {
      throw new HttpException(
        { message: 'Header fields do not contain ' + missingHeader },
        HttpStatus.BAD_REQUEST,
      );
    }
    const parseResult = await this.parseOffers(results);
    parseResult['key'] = null;
    parseResult['headerMapping'] = this.convertToColonSeparatedString(
      results.meta.fields as string[],
    );
    if (parseResult.failedRows.length == 0) {
      const bulkUploadData = await this.offerService.createNewBulkUploadEntry(
        parseResult.successRows,
        'offer',
        userId,
      );
      parseResult['key'] = bulkUploadData.accessKey;
    }
    return parseResult;
  }

  @Post('admin/offers/bulk-upload/confirm')
  async confirmOffersBulkUpload(
    @Headers('userId') userId: string,
    @Query('key') key,
    @Query('cancel') cancel,
  ) {
    const bulkUploadData = await this.offerService.getBulkUploadEntryByKey(
      'offer',
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
      await this.offerService.saveOffers(
        bulkUploadData.jsonData.data as OfferEntity[],
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

  async readCSVData(dataStream): Promise<any> {
    return new Promise((resolve, reject) => {
      const parsedCsv = parse(dataStream, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results);
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  }

  private checkMissingHeader(attributes: string[], fieldSet: Set<string>) {
    for (const attribute of attributes) {
      if (!fieldSet.has(attribute)) {
        return attribute;
      }
    }
    return null;
  }

  private async parseOffers(results: any) {
    const parseResult = { successRows: [], failedRows: [] };
    for (const offer of results.data) {
      offer.errors = [];
      if (
        offer.discount_type != null &&
        offer.discount_type != 'FLAT' &&
        offer.discount_type != 'PERCENT'
      ) {
        offer.errors.push({
          code: 'FIELD_ERROR',
          message: 'discount_type can only be FLAT or PERCENT',
          field: 'discount_type',
        });
      }
      if (offer.discount_value != null && isNaN(offer.discount_value)) {
        offer.errors.push({
          code: 'FIELD_ERROR',
          message: 'discount_value format incorrect',
          field: 'discount_value',
        });
      } else if (offer.discount_value != null) {
        offer.discount_value = Number(offer.discount_value);
      }
      if (offer.offer_start != null) {
        offer.offer_start = new Date(offer.offer_start);
        if (isNaN(offer.offer_start)) {
          offer.errors.push({
            code: 'FIELD_ERROR',
            message: 'offer_start format incorrect',
            field: 'offer_start',
          });
        }
      }
      if (offer.offer_end != null) {
        offer.offer_end = new Date(offer.offer_end);
        if (isNaN(offer.offer_end)) {
          offer.errors.push({
            code: 'FIELD_ERROR',
            message: 'offer_end format incorrect',
            field: 'offer_end',
          });
        }
      }
      if (offer.offer_application_rules != null) {
        const oar = this.parseOfferRulesJson(offer.offer_application_rules);
        if (oar == null) {
          offer.errors.push({
            code: 'FIELD_ERROR',
            message: 'offer_application_rules format incorrect',
            field: 'offer_application_rules',
          });
        } else {
          offer.offer_application_rules = oar;
        }
      }
      if (
        offer.offer_level != null &&
        offer.offer_level != 'ORDER' &&
        offer.offer_level != 'ORDERITEM'
      ) {
        offer.errors.push({
          code: 'FIELD_ERROR',
          message: 'discount_type can only be FLAT or PERCENT',
          field: 'discount_type',
        });
      }
      if (offer.offer_name == null) {
        offer.errors.push({
          code: 'FIELD_ERROR',
          message: 'offer_name cannot be null',
          field: 'offer_name',
        });
      }
      if (offer.active != null && !isNaN(offer.active)) {
        offer.active = Number(offer.active) != 0;
      }
      if (offer.errors.length == 0) {
        parseResult.successRows.push(offer);
      } else {
        parseResult.failedRows.push(offer);
      }
    }
    return parseResult;
  }

  private parseOfferRulesJson(offer_application_rules: any) {
    try {
      return JSON.parse(offer_application_rules);
    } catch (e) {
      return null;
    }
  }

  @Post('admin/vouchers/bulk-upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVouchersSheet(@UploadedFile() file, @Headers('userId') userId) {
    const fileBufferInBase64: string = file.buffer.toString('base64');
    const buffer = Buffer.from(fileBufferInBase64, 'base64');
    const dataStream = Readable.from(buffer);
    const results = await this.readCSVData(dataStream);
    const attributes = ['code', 'assigned_to'];
    const missingHeader = this.checkMissingHeader(
      attributes,
      new Set(results.meta.fields as string[]),
    );
    if (missingHeader != null) {
      throw new HttpException(
        { message: 'Header fields do not contain ' + missingHeader },
        HttpStatus.BAD_REQUEST,
      );
    }
    const offerNamesList = results.data.map((voucher) => {
      if (voucher.offer_name != null) {
        return voucher.offer_name;
      }
    });
    const offersList = await this.offerService.getOfferFromOfferNames(
      offerNamesList,
    );
    const offerMap = this.getOffersListMap(offersList);
    const parseResult = await this.parseVouchers(results, offerMap);
    parseResult['key'] = null;
    parseResult['headerMapping'] = this.convertToColonSeparatedString(
      results.meta.fields as string[],
    );
    if (parseResult.failedRows.length == 0) {
      const bulkUploadData = await this.offerService.createNewBulkUploadEntry(
        parseResult.successRows,
        'voucher',
        userId,
      );
      parseResult['key'] = bulkUploadData.accessKey;
    }
    return parseResult;
  }

  @Post('admin/vouchers/bulk-upload/confirm')
  async confirmVoucherBulkUpload(
    @Headers('userId') userId: string,
    @Query('key') key,
    @Query('cancel') cancel,
  ) {
    const bulkUploadData = await this.offerService.getBulkUploadEntryByKey(
      'voucher',
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
      await this.offerService.upsertVouchers(
        bulkUploadData.jsonData.data as VoucherEntity[],
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

  private async parseVouchers(
    results: any,
    offerMap: Map<string, OfferEntity>,
  ) {
    const parseResult = { successRows: [], failedRows: [] };
    for (const voucher of results.data) {
      voucher.errors = [];
      if (
        voucher.voucher_type != null &&
        voucher.voucher_type != 'STATIC' &&
        voucher.voucher_type != 'DYNAMIC'
      ) {
        voucher.errors.push({
          code: 'FIELD_ERROR',
          message: 'voucher_type can only be STATIC or DYNAMIC',
          field: 'voucher_type',
        });
      }
      if (
        voucher.applicable_for != null &&
        voucher.applicable_for != 'ALL' &&
        voucher.applicable_for != 'ASSIGNED'
      ) {
        voucher.errors.push({
          code: 'FIELD_ERROR',
          message: 'applicable_for can only be ALL or ASSIGNED',
          field: 'applicable_for',
        });
      }
      if (
        voucher.voucher_for != null &&
        voucher.voucher_for != 'FRANCHISE' &&
        voucher.voucher_for != 'CONSUMER'
      ) {
        voucher.errors.push({
          code: 'FIELD_ERROR',
          message: 'voucher_for can only be FRANCHISE or CONSUMER',
          field: 'voucher_for',
        });
      }
      if (voucher.assigned_to == null) {
        voucher.errors.push({
          code: 'FIELD_ERROR',
          message: 'assigned_to cannot be null',
          field: 'assigned_to',
        });
      }
      if (voucher.code == null) {
        voucher.errors.push({
          code: 'FIELD_ERROR',
          message: 'code cannot be null',
          field: 'code',
        });
      }
      if (voucher.offer_name == null) {
        voucher.errors.push({
          code: 'FIELD_ERROR',
          message: 'offer_name cannot be null',
          field: 'offer_name',
        });
      } else if (!offerMap.has(voucher.offer_name)) {
        voucher.errors.push({
          code: 'FIELD_ERROR',
          message: 'offer with name ' + voucher.offer_name + ' does not exist',
          field: 'offer_name',
        });
      } else {
        voucher.offer_id = offerMap.get(voucher.offer_name).id;
      }
      if (voucher.active != null && !isNaN(voucher.active)) {
        voucher.active = Number(voucher.active) != 0;
      }
      if (voucher.is_public != null && !isNaN(voucher.is_public)) {
        voucher.is_public = Number(voucher.is_public) != 0;
      }
      if (voucher.errors.length == 0) {
        parseResult.successRows.push(voucher);
      } else {
        parseResult.failedRows.push(voucher);
      }
    }
    return parseResult;
  }

  private getOffersListMap(offersList) {
    const offerNameOfferMap = new Map<string, OfferEntity>();
    for (const offer of offersList) {
      offerNameOfferMap.set(offer.offer_name, offer);
    }
    return offerNameOfferMap;
  }

  private convertToColonSeparatedString(textArray: string[]) {
    let text = '';
    const arrayLength = textArray.length;
    for (let i = 0; i < arrayLength; i++) {
      const val = textArray[i];
      text += val + ':' + val;
      if (i != arrayLength - 1) {
        text += ',';
      }
    }
    return text;
  }

  @Post('internal/franchise/fetch/auto-apply')
  async fetchAutoApplyOffers(
    @Body() franchiseOrderDetailsDto: FranchiseOrderDetailsDto,
  ) {
    let order: FranchiseOrder = null;
    if (franchiseOrderDetailsDto.order !== null) {
      order = franchiseOrderDetailsDto.order;
    } else {
      order = await this.clientService.getFranchiseOrderFromInternalCall(
        franchiseOrderDetailsDto.orderId,
      );
    }
    const store = await this.clientService.getStoreFromId(order.storeId);
    order['daysSinceStoreCreated'] =
      store != null ? store.daysSinceCreation : null;
    const offers = await this.offerService.getVouchersFromUserAndStoreId(
      franchiseOrderDetailsDto.storeId,
      null,
      null,
      'FRANCHISE',
      true,
    );
    return { voucherCode: offers.length > 0 ? offers.at(0).code : null };
  }
}
