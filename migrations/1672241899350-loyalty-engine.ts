import { MigrationInterface, QueryRunner } from 'typeorm';

export class loyaltyEngine1672241899350 implements MigrationInterface {
  name = 'loyaltyEngine1672241899350';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "offers"."voucher"
            ADD "is_public" boolean NOT NULL DEFAULT true
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "offers"."voucher" DROP COLUMN "is_public"
        `);
  }
}
