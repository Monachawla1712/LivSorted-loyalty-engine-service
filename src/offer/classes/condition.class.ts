import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { RuleEngineOperator } from '../../core/enum/rule-engine-operator.enum';

export class Condition {
  @ApiProperty({ type: String })
  @IsNotEmpty()
  fact: string;

  @ApiProperty({ enum: RuleEngineOperator })
  @IsNotEmpty()
  operator: RuleEngineOperator;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  @IsNumber()
  value: number;
}
