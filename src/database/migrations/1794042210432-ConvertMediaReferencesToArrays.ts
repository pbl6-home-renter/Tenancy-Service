import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertMediaReferencesToArrays1794042210432 implements MigrationInterface {
  name = 'ConvertMediaReferencesToArrays1794042210432';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "meter_readings" ADD "evidence_media_ids" uuid array NOT NULL DEFAULT '{}'::uuid[]`,
    );
    await queryRunner.query(
      `UPDATE "meter_readings" SET "evidence_media_ids" = CASE WHEN "evidence_media_id" IS NULL THEN '{}'::uuid[] ELSE ARRAY["evidence_media_id"] END`,
    );
    await queryRunner.query(
      `ALTER TABLE "meter_readings" DROP COLUMN "evidence_media_id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "meter_readings" ADD "evidence_media_id" uuid`,
    );
    await queryRunner.query(
      `UPDATE "meter_readings" SET "evidence_media_id" = "evidence_media_ids"[1]`,
    );
    await queryRunner.query(
      `ALTER TABLE "meter_readings" DROP COLUMN "evidence_media_ids"`,
    );
  }
}
