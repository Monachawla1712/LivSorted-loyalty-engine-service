import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { ConditionType } from '../enum/condition-type.enum';
import { Condition } from './condition.class';
import { OfferEvent } from './event.class';
import { OfferLevel } from '../enum/offer-level.enum';
import { TopLevelCondition } from 'json-rules-engine';

export class OfferRules {
  @ApiProperty({ enum: ConditionType })
  @IsNotEmpty()
  type: ConditionType;

  @ApiProperty({ type: [Condition] })
  @IsNotEmpty()
  conditions: Condition[];

  @ApiProperty({ type: Event })
  @IsNotEmpty()
  event: OfferEvent;

  @ApiProperty({ enum: OfferLevel })
  @IsNotEmpty()
  offerLevel: OfferLevel;

  @ApiProperty({ enum: OfferLevel })
  @IsNotEmpty()
  viewRules: TopLevelCondition;
}
