import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { CommonEntity } from '../../core/common/common.entity';

@Entity({ name: 'redemption' })
export class RedemptionEntity extends CommonEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  user_id: string;

  @Column({ nullable: true })
  order_id: string;

  @Column({ nullable: true })
  offer_id: string;

  @Column({ nullable: true })
  voucher_id: string;

  @Column({ nullable: true })
  voucher_code: string;
}
