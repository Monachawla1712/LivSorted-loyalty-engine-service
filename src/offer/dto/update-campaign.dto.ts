import { IsInt, IsNumber } from 'class-validator';

export class UpdateCampaignDto {
  @IsNumber()
  weeklyCashbackPercent: number;

  @IsNumber()
  @IsInt()
  dailyCashbackPercent: number;

  @IsNumber()
  targetAmount: number;

  @IsNumber()
  @IsInt()
  status: number;
}
