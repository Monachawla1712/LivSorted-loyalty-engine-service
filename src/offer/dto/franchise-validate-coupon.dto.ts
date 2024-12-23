import { IsNotEmpty } from 'class-validator';
import { FranchiseOrderDetailsDto } from './franchise-order-details.dto';
export class FranchiseValidateCouponDto extends FranchiseOrderDetailsDto {
  @IsNotEmpty()
  code: string;
}
