import { IsOptional, IsString, Matches } from 'class-validator';
export class CashbackWalletUpdateDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  walletEligibilityDate: Date;

  @IsOptional()
  @IsString({ each: true })
  storeIds: string[];
}
