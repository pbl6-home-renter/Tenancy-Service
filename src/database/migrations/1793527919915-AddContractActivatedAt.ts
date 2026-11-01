import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContractActivatedAt1793527919915 implements MigrationInterface {
  name = 'AddContractActivatedAt1793527919915';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "activated_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "rooms" ALTER COLUMN "amenities" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "rate_policies" ALTER COLUMN "rates" SET DEFAULT '[]'::jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rate_policies" ALTER COLUMN "rates" SET DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "rooms" ALTER COLUMN "amenities" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN "activated_at"`,
    );
  }
}
