import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContractsTable1793335626475 implements MigrationInterface {
  name = 'CreateContractsTable1793335626475';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rooms" DROP CONSTRAINT "FK_rooms_building"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."contract_status_enum" AS ENUM('draft', 'signed', 'active', 'suspended', 'expired', 'terminated')`,
    );
    await queryRunner.query(
      `CREATE TABLE "contracts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "landlord_id" uuid NOT NULL, "room_id" uuid NOT NULL, "tenant_id" uuid, "tenant_name" character varying(254), "tenant_phone" character varying(12), "status" "public"."contract_status_enum" NOT NULL DEFAULT 'draft', "deposit_amount" numeric NOT NULL, "rent_price" numeric NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "vehicle_count" integer, "description" text, CONSTRAINT "CHK_contracts_description" CHECK (description IS NULL OR (char_length(btrim(description)) >= 1 AND char_length(description) <= 500)), CONSTRAINT "CHK_contracts_vehicle_count" CHECK (vehicle_count IS NULL OR vehicle_count >= 0), CONSTRAINT "CHK_contracts_rent_price" CHECK (rent_price >= 0), CONSTRAINT "CHK_contracts_deposit_amount" CHECK (deposit_amount >= 0), CONSTRAINT "CHK_contracts_dates" CHECK (start_date < end_date), CONSTRAINT "CHK_contracts_tenant_phone" CHECK (tenant_phone IS NULL OR tenant_phone ~ '^(0[0-9]{9}|[+]84[0-9]{9})$'), CONSTRAINT "CHK_contracts_tenant_name" CHECK (tenant_name IS NULL OR char_length(btrim(tenant_name)) >= 1), CONSTRAINT "CHK_contracts_tenant_identity" CHECK (tenant_id IS NOT NULL OR (NULLIF(BTRIM(tenant_name), '') IS NOT NULL AND NULLIF(BTRIM(tenant_phone), '') IS NOT NULL)), CONSTRAINT "PK_2c7b8f3a7b1acdd49497d83d0fb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_contracts_room_active" ON "contracts"  ("room_id") WHERE status = 'active'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_contracts_landlord" ON "contracts"  ("landlord_id") WHERE is_deleted = false`,
    );
    await queryRunner.query(
      `ALTER TABLE "rooms" ALTER COLUMN "amenities" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "rooms" ALTER COLUMN "deposit_amount" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD CONSTRAINT "FK_contracts_room" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP CONSTRAINT "FK_contracts_room"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rooms" ALTER COLUMN "deposit_amount" SET DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "rooms" ALTER COLUMN "amenities" SET DEFAULT '{}'`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_contracts_landlord"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_contracts_room_active"`);
    await queryRunner.query(`DROP TABLE "contracts"`);
    await queryRunner.query(`DROP TYPE "public"."contract_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "rooms" ADD CONSTRAINT "FK_rooms_building" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
