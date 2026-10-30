import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRatePoliciesTable1793400000000 implements MigrationInterface {
  name = 'CreateRatePoliciesTable1793400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."rate_policy_scope_enum" AS ENUM('building', 'room')`,
    );
    await queryRunner.query(
      `CREATE TABLE "rate_policies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "landlord_id" uuid NOT NULL, "scope" "public"."rate_policy_scope_enum" NOT NULL, "building_id" uuid, "room_id" uuid, "rates" jsonb NOT NULL DEFAULT '[]'::jsonb, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "CHK_rate_policies_scope_target" CHECK ((scope = 'building' AND building_id IS NOT NULL AND room_id IS NULL) OR (scope = 'room' AND building_id IS NOT NULL AND room_id IS NOT NULL)), CONSTRAINT "CHK_rate_policies_rates_array" CHECK (jsonb_typeof(rates) = 'array'), CONSTRAINT "PK_rate_policies_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_rate_policies_building" ON "rate_policies" ("building_id") WHERE scope = 'building'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_rate_policies_room" ON "rate_policies" ("room_id") WHERE scope = 'room'`,
    );
    await queryRunner.query(
      `ALTER TABLE "rate_policies" ADD CONSTRAINT "FK_rate_policies_building" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rate_policies" ADD CONSTRAINT "FK_rate_policies_room" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "rate_policies"`);
    await queryRunner.query(`DROP TYPE "public"."rate_policy_scope_enum"`);
  }
}
