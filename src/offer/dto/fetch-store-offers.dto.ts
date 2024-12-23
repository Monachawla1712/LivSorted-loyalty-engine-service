import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class FetchStoreOffersDto {
  @ApiProperty({ type: String })
  @IsUUID()
  customerId: string;
}
