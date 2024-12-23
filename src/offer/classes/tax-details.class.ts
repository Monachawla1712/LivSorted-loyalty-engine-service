import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class TaxDetails {
  @ApiProperty({ type: Number })
  @IsNotEmpty()
  cess: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  cessgst: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  cgst: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  cgstAmount: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  igst: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  igstAmount: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  sgst: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  sgstAmount: number;
}
