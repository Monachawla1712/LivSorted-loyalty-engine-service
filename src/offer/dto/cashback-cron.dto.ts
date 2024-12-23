import { IsOptional, IsString, Matches } from 'class-validator';
export class CashbackCronDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: Date;

  @IsOptional()
  @IsString({ each: true })
  storeIds: string[];
}
