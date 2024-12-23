import { HttpException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Order } from './classes/order.class';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import * as moment from 'moment';
import { FranchiseOrderResponseWithEffectivePrice } from './classes/franchise-order-response-with-effective-price.class';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { FranchiseOrder } from './classes/franchise-order.class';
import { WalletListItemResponse } from './classes/wallet-list-item-response.class';

@Injectable()
export class ClientService {
  private readonly logger = new CustomLogger(ClientService.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}
  async getCartFromInternalCall(userId): Promise<Order> {
    try {
      const cart = await firstValueFrom(
        this.httpService.request({
          method: 'get',
          baseURL: this.configService.get('orderServiceBaseUrl'),
          url: `/orders/internal/cart/${userId}`,
          headers: {
            Authorization: `Bearer ${this.configService.get('internalToken')}`,
          },
        }),
      );
      return cart.data.data;
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while fetching cart',
        e,
      );
      throw new HttpException(
        { message: 'something went wrong while fetching user cart.' },
        500,
      );
    }
  }

  async getFranchiseCartFromInternalCall(storeId): Promise<FranchiseOrder> {
    try {
      const cart = await firstValueFrom(
        this.httpService.request({
          method: 'get',
          baseURL: this.configService.get('orderServiceBaseUrl'),
          url: `/orders/franchise/internal/cart/${storeId}`,
          headers: {
            Authorization: `Bearer ${this.configService.get('internalToken')}`,
          },
        }),
      );
      return cart.data.data;
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while fetching cart',
        e,
      );
      throw new HttpException(
        { message: 'something went wrong while fetching franchise cart.' },
        500,
      );
    }
  }

  async getFranchiseOrderFromInternalCall(
    orderId: string,
  ): Promise<FranchiseOrder> {
    try {
      const order = await firstValueFrom(
        this.httpService.request({
          method: 'get',
          baseURL: this.configService.get('orderServiceBaseUrl'),
          url: `/orders/franchise/${orderId}/backoffice`,
          headers: {
            Authorization: `Bearer ${this.configService.get('internalToken')}`,
          },
        }),
      );
      return order.data;
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while fetching order',
        e,
      );
      throw new HttpException(
        { message: 'something went wrong while fetching order.' },
        500,
      );
    }
  }

  async getStoreFromId(storeId: string) {
    let store = null;
    try {
      const storeResponse = await firstValueFrom(
        this.httpService.request({
          method: 'get',
          baseURL: this.configService.get('orderServiceBaseUrl'),
          url: `/store-app/internal/store/${storeId}`,
          headers: {
            Authorization: `Bearer ${this.configService.get('internalToken')}`,
          },
        }),
      );
      store = storeResponse.data;
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while fetching store',
        e,
      );
    }
    if (store != null) {
      store.daysSinceCreation = this.getStoreCreationDays(store);
    }
    return store;
  }

  private getStoreCreationDays(store: any) {
    if (store['createdAt'] != null) {
      return this.getDaysBetween(store['createdAt'], new Date());
    }
    return 1000;
  }

  getDaysBetween(date1: Date, date2: Date) {
    const momentDate1 = moment(date1);
    const momentDate2 = moment(date2);
    return Math.abs(momentDate2.diff(momentDate1, 'days'));
  }

  async getOrdersWithEffectivePrice(
    date: Date,
    storeIds: string[],
  ): Promise<FranchiseOrderResponseWithEffectivePrice[]> {
    try {
      const orders = await firstValueFrom(
        this.httpService.request({
          method: 'post',
          baseURL: this.configService.get('orderServiceBaseUrl'),
          url: `/orders/franchise/internal/effective-bill-amount`,
          data: {
            date: date.toISOString().split('T')[0],
            storeIds: storeIds,
          },
          headers: {
            Authorization: `Bearer ${this.configService.get('internalToken')}`,
          },
        }),
      );
      return orders.data;
    } catch (e) {
      throw new HttpException(
        { message: 'something went wrong while fetching orders.' },
        500,
      );
    }
  }

  async addOrDeductFromWallet(
    storeId: string,
    amount: number,
    txnType: string,
    txnDetail: string,
    remarks: string,
    walletType: string,
    holdAmount: number,
    key: string,
  ) {
    try {
      const paymentsResponse = await firstValueFrom(
        this.httpService.request({
          method: 'post',
          baseURL: this.configService.get('paymentServiceBaseUrl'),
          url: `/payments/wallet/addOrDeduct/STORE/${storeId}`,
          params: { key: key },
          data: {
            amount: amount,
            txnType: txnType,
            txnDetail: txnDetail,
            remarks: remarks,
            walletType: walletType,
            holdAmount: holdAmount,
          },
          headers: {
            Authorization: `Bearer ${this.configService.get('internalToken')}`,
          },
        }),
      );
      return paymentsResponse.data;
    } catch (e) {
      throw new HttpException(
        { message: 'something went wrong while updating wallet.' },
        500,
      );
    }
  }

  async fetchStoreWalletsInternal(
    storeIds: string[],
  ): Promise<WalletListItemResponse[]> {
    try {
      const paymentsResponse = await firstValueFrom(
        this.httpService.request({
          method: 'post',
          baseURL: this.configService.get('paymentServiceBaseUrl'),
          url: `/payments/wallet/internal`,
          data: {
            storeIds: storeIds,
          },
          headers: {
            Authorization: `Bearer ${this.configService.get('internalToken')}`,
          },
        }),
      );
      return paymentsResponse.data;
    } catch (e) {
      throw new HttpException(
        { message: 'something went wrong while fetching wallet data.' },
        500,
      );
    }
  }
}
