import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { CommonEntity } from '../../core/common/common.entity';
import { VoucherType } from '../enum/voucher-type.enum';
import { ApplicableFor } from '../enum/applicable-for.enum';
import { OfferEntity } from './offers.entity';
import { CreateVoucherDto } from '../dto/create-voucher.dto';

@Entity({ name: 'voucher' })
export class VoucherEntity extends CommonEntity {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id: string;

  @Column()
  code: string;

  @Column('uuid')
  offer_id: string;

  @Column({
    type: 'enum',
    enum: VoucherType,
  })
  voucher_type: string;

  @Column()
  assigned_to: string;

  @Column({
    type: 'enum',
    enum: ApplicableFor,
  })
  applicable_for: ApplicableFor;

  @Column({ default: false, nullable: true })
  is_redeemed: boolean;

  @Column('boolean', { default: true })
  is_public: boolean;

  @Column()
  voucher_for: string;

  @Column()
  active: boolean;

  @Column()
  campaign_id: number;

  @ManyToOne(() => OfferEntity, (offer) => offer.id)
  @JoinColumn({ name: 'offer_id', referencedColumnName: 'id' })
  offer: OfferEntity;

  static createNewVoucherFromDto(
    createVoucherDto: CreateVoucherDto,
    entityId,
    userId: string,
  ) {
    const voucher = new VoucherEntity();
    voucher.offer_id = createVoucherDto.offer_id;
    voucher.voucher_for =
      createVoucherDto.voucher_for != null
        ? createVoucherDto.voucher_for
        : 'FRANCHISE';
    voucher.voucher_type =
      createVoucherDto.voucher_type != null
        ? createVoucherDto.voucher_type
        : VoucherType.STATIC;
    voucher.applicable_for = createVoucherDto.applicable_for;
    voucher.assigned_to = entityId;
    voucher.is_public =
      createVoucherDto.is_public != null ? createVoucherDto.is_public : true;
    voucher.updated_by = userId;
    return voucher;
  }

  static createNewVoucherEntity(
    offerId: string,
    code: string,
    entityId: string,
    voucherFor: string,
    voucherType: string,
    applicableFor: ApplicableFor,
    isPublic: boolean,
    campaignId: number,
    userId: string,
  ) {
    const voucher = new VoucherEntity();
    voucher.code = code;
    voucher.offer_id = offerId;
    voucher.voucher_for = voucherFor;
    voucher.voucher_type = voucherType;
    voucher.applicable_for = applicableFor;
    voucher.assigned_to = entityId;
    voucher.is_public = isPublic;
    voucher.campaign_id = campaignId;
    voucher.updated_by = userId;
    return voucher;
  }
}
