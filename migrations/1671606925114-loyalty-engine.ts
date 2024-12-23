import { MigrationInterface, QueryRunner } from 'typeorm';

export class loyaltyEngine1671606925114 implements MigrationInterface {
  name = 'loyaltyEngine1671606925114';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "offers"."offer"
            ADD "max_limit" integer
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
            ALTER TABLE "offers"."offer" DROP COLUMN "max_limit"
        `);
  }
}
