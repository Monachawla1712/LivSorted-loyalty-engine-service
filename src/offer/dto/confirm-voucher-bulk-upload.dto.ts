import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class ConfirmBulkUploadDto {
  @IsNotEmpty()
  key: string;

  @IsOptional()
  @IsNumber()
  cancel: number;
}
