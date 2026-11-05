import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInvoicesTable1793867200921 implements MigrationInterface {
  name = 'CreateInvoicesTable1793867200921';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."invoice_status_enum" AS ENUM('pending', 'issued', 'void')`,
    );
    await queryRunner.query(
      `CREATE TABLE "invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "contract_id" uuid NOT NULL, "code" character varying(32) NOT NULL, "period" character varying(7) NOT NULL, "rent_amount" numeric(14,4) NOT NULL, "breakdown" jsonb NOT NULL DEFAULT '[]'::jsonb, "other_fees" jsonb NOT NULL DEFAULT '[]'::jsonb, "total_amount" numeric(14,0) NOT NULL, "status" "public"."invoice_status_enum" NOT NULL DEFAULT 'pending', "issued_at" TIMESTAMP WITH TIME ZONE, "voided_invoice_id" uuid, "void_reason" text, "note" text, CONSTRAINT "CHK_invoices_issued_at" CHECK ((status = 'pending' AND issued_at IS NULL) OR (status = 'issued' AND issued_at IS NOT NULL) OR status = 'void'), CONSTRAINT "CHK_invoices_other_fees_array" CHECK (jsonb_typeof(other_fees) = 'array'), CONSTRAINT "CHK_invoices_breakdown_array" CHECK (jsonb_typeof(breakdown) = 'array'), CONSTRAINT "CHK_invoices_total_amount" CHECK (total_amount >= 0 AND total_amount = round(total_amount)), CONSTRAINT "CHK_invoices_rent_amount" CHECK (rent_amount >= 0), CONSTRAINT "CHK_invoices_code" CHECK (code ~ '^INV-[0-9]{6}-[A-Z0-9]{4}$'), CONSTRAINT "CHK_invoices_period" CHECK (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'), CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_invoices_contract_period" ON "invoices"  ("contract_id", "period") WHERE status IN ('pending', 'issued') AND is_deleted = false`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_invoices_code" ON "invoices"  ("code") `,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_contract" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_voided_invoice" FOREIGN KEY ("voided_invoice_id") REFERENCES "invoices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT "FK_invoices_voided_invoice"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT "FK_invoices_contract"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_invoices_code"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_invoices_contract_period"`,
    );
    await queryRunner.query(`DROP TABLE "invoices"`);
    await queryRunner.query(`DROP TYPE "public"."invoice_status_enum"`);
  }
}
