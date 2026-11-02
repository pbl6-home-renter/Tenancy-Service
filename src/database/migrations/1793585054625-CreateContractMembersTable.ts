import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContractMembersTable1793585054625 implements MigrationInterface {
  name = 'CreateContractMembersTable1793585054625';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "contract_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "contract_id" uuid NOT NULL, "tenant_id" uuid, "tenant_name" character varying(254), "tenant_phone" character varying(12), "joined_at" date NOT NULL, "left_at" date, CONSTRAINT "CHK_contract_members_phone" CHECK (tenant_phone IS NULL OR tenant_phone ~ '^(0[0-9]{9}|[+]84[0-9]{9})$'), CONSTRAINT "CHK_contract_members_name" CHECK (tenant_name IS NULL OR char_length(btrim(tenant_name)) >= 1), CONSTRAINT "CHK_contract_members_identity" CHECK (tenant_id IS NOT NULL OR (NULLIF(BTRIM(tenant_name), '') IS NOT NULL AND tenant_phone IS NOT NULL)), CONSTRAINT "CHK_contract_members_dates" CHECK (left_at IS NULL OR left_at >= joined_at), CONSTRAINT "PK_cf7c9ab2fc013f57c4a907a2931" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_contract_members_active_tenant" ON "contract_members"  ("contract_id", "tenant_id") WHERE tenant_id IS NOT NULL AND left_at IS NULL AND is_deleted = false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_contract_members_contract" ON "contract_members"  ("contract_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_contract_members_tenant" ON "contract_members"  ("tenant_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "rooms" ALTER COLUMN "amenities" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "rate_policies" ALTER COLUMN "rates" SET DEFAULT '[]'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_members" ADD CONSTRAINT "FK_contract_members_contract" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contract_members" DROP CONSTRAINT "FK_contract_members_contract"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rate_policies" ALTER COLUMN "rates" SET DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "rooms" ALTER COLUMN "amenities" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_contract_members_tenant"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_contract_members_contract"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_contract_members_active_tenant"`,
    );
    await queryRunner.query(`DROP TABLE "contract_members"`);
  }
}
