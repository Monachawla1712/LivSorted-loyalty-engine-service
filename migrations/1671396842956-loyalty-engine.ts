import { MigrationInterface, QueryRunner } from 'typeorm';

export class loyaltyEngine1671396842956 implements MigrationInterface {
  name = 'loyaltyEngine1671396842956';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "offers"."offer"
            ADD "sidebar_note" character varying
        `);
    await queryRunner.query(`
            ALTER TABLE "offers"."voucher"
            ALTER COLUMN "id" DROP DEFAULT
        `);
    await queryRunner.query(`
            ALTER TABLE "offers"."voucher"
            ALTER COLUMN "id"
            SET DEFAULT gen_random_uuid()
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "offers"."voucher"
            ALTER COLUMN "id" DROP DEFAULT
        `);
    await queryRunner.query(`
            ALTER TABLE "offers"."voucher"
            ALTER COLUMN "id"
            SET DEFAULT uuid_generate_v4()
        `);
    await queryRunner.query(`
            ALTER TABLE "offers"."offer" DROP COLUMN "sidebar_note"
        `);
  }
}
