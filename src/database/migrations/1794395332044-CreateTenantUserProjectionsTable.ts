import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenantUserProjectionsTable1794395332044 implements MigrationInterface {
  name = 'CreateTenantUserProjectionsTable1794395332044';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tenant_user_projections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "user_id" uuid NOT NULL, "phone" character varying(10) NOT NULL, CONSTRAINT "PK_7cb79271ddcf9a6f2ec0c6b645e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_tenant_user_projections_phone" ON "tenant_user_projections"  ("phone") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_tenant_user_projections_user" ON "tenant_user_projections"  ("user_id") `,
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
      `DROP INDEX "public"."UQ_tenant_user_projections_user"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_tenant_user_projections_phone"`,
    );
    await queryRunner.query(`DROP TABLE "tenant_user_projections"`);
  }
}
