import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMeterReadingsTable1793438776264 implements MigrationInterface {
  name = 'CreateMeterReadingsTable1793438776264';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."meter_reading_type_enum" AS ENUM('electricity', 'water')`,
    );
    await queryRunner.query(
      `CREATE TABLE "meter_readings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "landlord_id" uuid NOT NULL, "building_id" uuid NOT NULL, "room_id" uuid NOT NULL, "type" "public"."meter_reading_type_enum" NOT NULL, "period" character varying(7) NOT NULL, "previous_reading" numeric NOT NULL, "current_reading" numeric NOT NULL, "is_baseline" boolean NOT NULL DEFAULT false, "evidence_media_id" uuid NOT NULL, CONSTRAINT "CHK_meter_readings_nonnegative" CHECK (previous_reading >= 0 AND current_reading >= previous_reading), CONSTRAINT "CHK_meter_readings_period" CHECK (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'), CONSTRAINT "CHK_meter_readings_precision" CHECK (previous_reading = round(previous_reading, 2) AND current_reading = round(current_reading, 2)), CONSTRAINT "PK_e1a17bbc8bfc32c9d70adc7c2bc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_meter_readings_room_type_period" ON "meter_readings" ("room_id", "type", "period") WHERE is_deleted = false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_meter_readings_landlord_period" ON "meter_readings" ("landlord_id", "period") WHERE is_deleted = false`,
    );
    await queryRunner.query(
      `ALTER TABLE "meter_readings" ADD CONSTRAINT "FK_meter_readings_building" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meter_readings" ADD CONSTRAINT "FK_meter_readings_room" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "meter_readings" DROP CONSTRAINT "FK_meter_readings_room"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meter_readings" DROP CONSTRAINT "FK_meter_readings_building"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_meter_readings_landlord_period"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_meter_readings_room_type_period"`,
    );
    await queryRunner.query(`DROP TABLE "meter_readings"`);
    await queryRunner.query(`DROP TYPE "public"."meter_reading_type_enum"`);
  }
}
