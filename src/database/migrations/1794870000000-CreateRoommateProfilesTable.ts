import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRoommateProfilesTable1794870000000 implements MigrationInterface {
  name = 'CreateRoommateProfilesTable1794870000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "roommate_profiles" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      "is_deleted" boolean NOT NULL DEFAULT false,
      "tenant_id" uuid NOT NULL,
      "is_visible" boolean NOT NULL DEFAULT false,
      "bio" varchar(1000),
      "gender" varchar(10),
      "birth_year" integer,
      "occupation" varchar(100),
      "preferred_province" varchar(100),
      "preferred_district" varchar(100),
      "preferred_area" varchar(255),
      "budget_min" numeric(15,0),
      "budget_max" numeric(15,0),
      "move_in_on" date,
      "lifestyle" jsonb,
      CONSTRAINT "PK_roommate_profiles" PRIMARY KEY ("id"),
      CONSTRAINT "CHK_roommate_profiles_budget" CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max),
      CONSTRAINT "CHK_roommate_profiles_visible_bio" CHECK (is_visible = false OR NULLIF(BTRIM(bio), '') IS NOT NULL)
    )`);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_roommate_profiles_tenant" ON "roommate_profiles" ("tenant_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_roommate_profiles_visible" ON "roommate_profiles" ("id") WHERE is_visible = true AND is_deleted = false',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_roommate_profiles_visible"');
    await queryRunner.query('DROP INDEX "UQ_roommate_profiles_tenant"');
    await queryRunner.query('DROP TABLE "roommate_profiles"');
  }
}
