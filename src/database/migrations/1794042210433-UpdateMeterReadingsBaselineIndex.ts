import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateMeterReadingsBaselineIndex1794042210433 implements MigrationInterface {
  name = 'UpdateMeterReadingsBaselineIndex1794042210433';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_meter_readings_room_type_period"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_meter_readings_room_type_period" ON "meter_readings" ("room_id", "type", "period") WHERE is_baseline = false AND is_deleted = false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_meter_readings_room_type_period"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_meter_readings_room_type_period" ON "meter_readings" ("room_id", "type", "period") WHERE is_deleted = false`,
    );
  }
}
