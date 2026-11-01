import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContractTemplatesTable1793498965702 implements MigrationInterface {
  name = 'CreateContractTemplatesTable1793498965702';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "contract_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "template_key" character varying(100) NOT NULL, "title" character varying(254) NOT NULL, "version" character varying(50) NOT NULL, "body" text NOT NULL, "required_variables" jsonb NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_59af2fd9eadd293fe10fdb2c702" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_contract_templates_template_key" ON "contract_templates"  ("template_key") `,
    );
    await queryRunner.query(
      `ALTER TABLE "rooms" ALTER COLUMN "amenities" SET DEFAULT '{}'::jsonb`,
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
      `ALTER TABLE "rooms" ALTER COLUMN "amenities" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_contract_templates_template_key"`,
    );
    await queryRunner.query(`DROP TABLE "contract_templates"`);
  }
}
