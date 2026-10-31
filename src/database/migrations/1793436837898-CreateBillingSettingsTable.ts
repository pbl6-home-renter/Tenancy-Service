import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBillingSettingsTable1793436837898 implements MigrationInterface {
  name = 'CreateBillingSettingsTable1793436837898';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."billing_setting_scope_enum" AS ENUM('building', 'room')`,
    );
    await queryRunner.query(
      `CREATE TABLE "billing_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "landlord_id" uuid NOT NULL, "scope" "public"."billing_setting_scope_enum" NOT NULL, "building_id" uuid NOT NULL, "room_id" uuid, "payment_due_day" smallint NOT NULL DEFAULT '5', "remind_day" smallint, "bot_enabled" boolean NOT NULL DEFAULT true, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "CHK_billing_settings_remind_day" CHECK (remind_day IS NULL OR remind_day BETWEEN 1 AND 28), CONSTRAINT "CHK_billing_settings_payment_due_day" CHECK (payment_due_day BETWEEN 1 AND 28), CONSTRAINT "CHK_billing_settings_scope_target" CHECK ((scope = 'building' AND building_id IS NOT NULL AND room_id IS NULL) OR (scope = 'room' AND building_id IS NOT NULL AND room_id IS NOT NULL)), CONSTRAINT "PK_50de306c9059fe5297a3483516a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_billing_settings_room" ON "billing_settings"  ("room_id") WHERE scope = 'room' AND is_deleted = false`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_billing_settings_building" ON "billing_settings"  ("building_id") WHERE scope = 'building' AND is_deleted = false`,
    );
    await queryRunner.query(
      `ALTER TABLE "billing_settings" ADD CONSTRAINT "FK_billing_settings_building" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "billing_settings" ADD CONSTRAINT "FK_billing_settings_room" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "billing_settings" DROP CONSTRAINT "FK_billing_settings_room"`,
    );
    await queryRunner.query(
      `ALTER TABLE "billing_settings" DROP CONSTRAINT "FK_billing_settings_building"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_billing_settings_building"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_billing_settings_room"`);
    await queryRunner.query(`DROP TABLE "billing_settings"`);
    await queryRunner.query(`DROP TYPE "public"."billing_setting_scope_enum"`);
  }
}
