import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLandlordLockCycles1794659391950 implements MigrationInterface {
  name = 'CreateLandlordLockCycles1794659391950';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "landlord_lock_cycles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "landlord_id" uuid NOT NULL, "locked_at" TIMESTAMP WITH TIME ZONE NOT NULL, "grace_deadline" TIMESTAMP WITH TIME ZONE NOT NULL, "contract_ids" uuid array NOT NULL, "state" character varying(20) NOT NULL, CONSTRAINT "CHK_landlord_lock_cycles_state" CHECK (state IN ('pending', 'elapsed', 'superseded')), CONSTRAINT "CHK_landlord_lock_cycles_deadline" CHECK (grace_deadline > locked_at), CONSTRAINT "PK_333640e30f738bfc261ac2a3f41" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_landlord_lock_cycles_due" ON "landlord_lock_cycles"  ("grace_deadline") WHERE state = 'pending' AND is_deleted = false`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_landlord_lock_cycles_landlord_locked_at" ON "landlord_lock_cycles"  ("landlord_id", "locked_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN "template_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rooms" ALTER COLUMN "amenities" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "rooms" ALTER COLUMN "photo_media_ids" SET DEFAULT '{}'::uuid[]`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ALTER COLUMN "breakdown" SET DEFAULT '[]'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ALTER COLUMN "other_fees" SET DEFAULT '[]'::jsonb`,
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
      `ALTER TABLE "invoices" ALTER COLUMN "other_fees" SET DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ALTER COLUMN "breakdown" SET DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "rooms" ALTER COLUMN "photo_media_ids" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "rooms" ALTER COLUMN "amenities" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "template_key" character varying(100)`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_landlord_lock_cycles_landlord_locked_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_landlord_lock_cycles_due"`,
    );
    await queryRunner.query(`DROP TABLE "landlord_lock_cycles"`);
  }
}
