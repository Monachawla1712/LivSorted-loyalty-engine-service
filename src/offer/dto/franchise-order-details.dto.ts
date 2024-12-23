import { IsNotEmpty } from 'class-validator';
import { FranchiseOrder } from '../classes/franchise-order.class';
export class FranchiseOrderDetailsDto {
  @IsNotEmpty()
  storeId: string;

  @IsNotEmpty()
  orderId: string;

  @IsNotEmpty()
  order: FranchiseOrder;
}
