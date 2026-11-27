import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveLandlordLockSaga1795779740684 implements MigrationInterface {
  name = 'RemoveLandlordLockSaga1795779740684';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "contracts" SET "status" = 'active' WHERE "status" = 'suspended'`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_contracts_room_occupancy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP CONSTRAINT "CHK_contracts_lock_handover"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."contract_status_enum" RENAME TO "contract_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."contract_status_enum" AS ENUM('draft', 'signed', 'active', 'expired', 'terminated')`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ALTER COLUMN "status" TYPE "public"."contract_status_enum" USING "status"::"text"::"public"."contract_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ALTER COLUMN "status" SET DEFAULT 'draft'`,
    );
    await queryRunner.query(`DROP TYPE "public"."contract_status_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD CONSTRAINT "CHK_contracts_lock_handover" CHECK ((lock_termination_cycle_id IS NULL AND handover_completed_on IS NULL) OR (lock_termination_cycle_id IS NOT NULL AND status = 'terminated'))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_contracts_room_occupancy" ON "contracts" ("room_id") WHERE is_deleted = false AND (status = 'active' OR (status = 'terminated' AND lock_termination_cycle_id IS NOT NULL AND handover_completed_on IS NULL))`,
    );
    await queryRunner.query(`DROP TABLE "landlord_lock_cycles"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_contracts_room_occupancy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP CONSTRAINT "CHK_contracts_lock_handover"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."contract_status_enum" RENAME TO "contract_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."contract_status_enum" AS ENUM('draft', 'signed', 'active', 'suspended', 'expired', 'terminated')`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ALTER COLUMN "status" TYPE "public"."contract_status_enum" USING "status"::"text"::"public"."contract_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ALTER COLUMN "status" SET DEFAULT 'draft'`,
    );
    await queryRunner.query(`DROP TYPE "public"."contract_status_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD CONSTRAINT "CHK_contracts_lock_handover" CHECK ((lock_termination_cycle_id IS NULL AND handover_completed_on IS NULL) OR (lock_termination_cycle_id IS NOT NULL AND status = 'terminated'))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_contracts_room_occupancy" ON "contracts" ("room_id") WHERE is_deleted = false AND (status IN ('active', 'suspended') OR (status = 'terminated' AND lock_termination_cycle_id IS NOT NULL AND handover_completed_on IS NULL))`,
    );
    await queryRunner.query(
      `CREATE TABLE "landlord_lock_cycles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "landlord_id" uuid NOT NULL, "locked_at" TIMESTAMP WITH TIME ZONE NOT NULL, "grace_deadline" TIMESTAMP WITH TIME ZONE NOT NULL, "contract_ids" uuid array NOT NULL, "state" character varying(20) NOT NULL, "unlocked_at" TIMESTAMP WITH TIME ZONE, "decisions" jsonb NOT NULL DEFAULT '{}'::jsonb, CONSTRAINT "CHK_landlord_lock_cycles_resolution_state" CHECK (state IN ('pending', 'elapsed', 'superseded', 'decision_pending', 'completed')), CONSTRAINT "CHK_landlord_lock_cycles_deadline" CHECK (grace_deadline > locked_at), CONSTRAINT "PK_333640e30f738bfc261ac2a3f41" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_landlord_lock_cycles_resolution_due" ON "landlord_lock_cycles" ("grace_deadline") WHERE state IN ('pending', 'elapsed') AND is_deleted = false`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_landlord_lock_cycles_landlord_locked_at" ON "landlord_lock_cycles" ("landlord_id", "locked_at")`,
    );
  }
}
