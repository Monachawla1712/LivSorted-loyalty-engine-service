import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { CommonEntity } from '../../core/common/common.entity';
import { DiscountType } from '../enum/discount-type.enum';
import { OfferRules } from '../classes/rules.class';
import { ApiProperty } from '@nestjs/swagger';
import { CreateOfferDto } from '../dto/create-offer.dto';
import { ConditionType } from '../enum/condition-type.enum';
import { OfferEvent } from '../classes/event.class';
import { RuleProperties, TopLevelCondition } from 'json-rules-engine';

@Entity({ name: 'offer' })
export class OfferEntity extends CommonEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'offer_name' })
  offer_name: string;

  @Column({ name: 'offer_level' })
  offer_level: string;

  @Column('jsonb', { name: 'offer_application_rules' })
  offer_application_rules: RuleProperties;

  @Column('jsonb', { name: 'offer_view_rules' })
  offer_view_rules: TopLevelCondition;

  @Column({
    type: 'enum',
    enum: DiscountType,
  })
  discount_type: DiscountType;

  @Column('int4')
  discount_value: number;

  @Column('int4', { nullable: true })
  max_limit: number;

  @ApiProperty({ type: String })
  @Column()
  title: string;

  @ApiProperty({ type: String })
  @Column({ nullable: true })
  sidebar_note: string;

  @Column('timestamp')
  offer_start: Date;

  @Column('timestamp')
  offer_end: Date;

  @Column()
  terms: string;

  @Column('jsonb', { default: {} })
  rules: OfferRules;

  @Column('boolean')
  is_auto_applicable: boolean;

  @Column('boolean')
  active = true;

  static createNewOfferFromDto(createOfferDto: CreateOfferDto, userId: string) {
    const offer = new OfferEntity();
    offer.sidebar_note = createOfferDto.sidebarNote;
    offer.terms = createOfferDto.terms;
    offer.title = createOfferDto.title;
    offer.offer_start = createOfferDto.offer_start;
    offer.offer_end = createOfferDto.offer_end;
    offer.updated_by = userId;
    offer.max_limit = createOfferDto.max_limit;
    offer.discount_type = createOfferDto.discount_type;
    offer.discount_value = createOfferDto.discount_value;
    offer.active = createOfferDto.active;
    const rulesObject = new OfferRules();
    rulesObject.offerLevel = createOfferDto.offerLevel;
    rulesObject.conditions = createOfferDto.conditions;
    rulesObject.type = ConditionType.ALL;
    rulesObject.type = createOfferDto.offerCondition;
    const offerEvent = new OfferEvent();
    offerEvent.type = createOfferDto.type;
    offerEvent.params = {};
    rulesObject.event = offerEvent;
    offer.rules = rulesObject;
    return offer;
  }

  static createNewOfferEntity(
    terms: string,
    title: string,
    offerStart: Date,
    offerEnd: Date,
    maxLimit: number,
    discountType: DiscountType,
    discountValue: number,
    offerApplicationRules: RuleProperties,
    offerName: string,
    offerLevel: string,
    isAutoApplicable: boolean,
    userId: string,
  ) {
    const offer = new OfferEntity();
    offer.terms = terms;
    offer.title = title;
    offer.offer_start = offerStart;
    offer.offer_end = offerEnd;
    offer.max_limit = maxLimit;
    offer.discount_type = discountType;
    offer.discount_value = discountValue;
    offer.offer_application_rules = offerApplicationRules;
    offer.offer_name = offerName;
    offer.offer_level = offerLevel;
    offer.is_auto_applicable = isAutoApplicable;
    offer.updated_by = userId;
    return offer;
  }
}
