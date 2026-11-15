import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResolveLandlordLockCycles1794718556823 implements MigrationInterface {
  name = 'ResolveLandlordLockCycles1794718556823';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_landlord_lock_cycles_due"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_contracts_room_active"`);
    await queryRunner.query(
      `ALTER TABLE "landlord_lock_cycles" DROP CONSTRAINT "CHK_landlord_lock_cycles_state"`,
    );
    await queryRunner.query(
      `ALTER TABLE "landlord_lock_cycles" ADD "unlocked_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "landlord_lock_cycles" ADD "decisions" jsonb NOT NULL DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "lock_termination_cycle_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "handover_completed_on" date`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_landlord_lock_cycles_resolution_due" ON "landlord_lock_cycles"  ("grace_deadline") WHERE state IN ('pending', 'elapsed') AND is_deleted = false`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_contracts_room_occupancy" ON "contracts"  ("room_id") WHERE is_deleted = false AND (status IN ('active', 'suspended') OR (status = 'terminated' AND lock_termination_cycle_id IS NOT NULL AND handover_completed_on IS NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "landlord_lock_cycles" ADD CONSTRAINT "CHK_landlord_lock_cycles_resolution_state" CHECK (state IN ('pending', 'elapsed', 'superseded', 'decision_pending', 'completed'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD CONSTRAINT "CHK_contracts_lock_handover" CHECK ((lock_termination_cycle_id IS NULL AND handover_completed_on IS NULL) OR (lock_termination_cycle_id IS NOT NULL AND status = 'terminated'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP CONSTRAINT "CHK_contracts_lock_handover"`,
    );
    await queryRunner.query(
      `ALTER TABLE "landlord_lock_cycles" DROP CONSTRAINT "CHK_landlord_lock_cycles_resolution_state"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_contracts_room_occupancy"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_landlord_lock_cycles_resolution_due"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN "handover_completed_on"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN "lock_termination_cycle_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "landlord_lock_cycles" DROP COLUMN "decisions"`,
    );
    await queryRunner.query(
      `ALTER TABLE "landlord_lock_cycles" DROP COLUMN "unlocked_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "landlord_lock_cycles" ADD CONSTRAINT "CHK_landlord_lock_cycles_state" CHECK (((state)::text = ANY ((ARRAY['pending'::character varying, 'elapsed'::character varying, 'superseded'::character varying])::text[])))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_contracts_room_active" ON "contracts" USING btree ("room_id") WHERE (status = 'active'::contract_status_enum)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_landlord_lock_cycles_due" ON "landlord_lock_cycles" USING btree ("grace_deadline") WHERE (((state)::text = 'pending'::text) AND (is_deleted = false))`,
    );
  }
}
