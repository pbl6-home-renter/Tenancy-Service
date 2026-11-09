import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInvoiceIdempotencyKeysTable1794200000000 implements MigrationInterface {
  name = 'CreateInvoiceIdempotencyKeysTable1794200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "idempotency_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" uuid NOT NULL, "user_id" uuid NOT NULL, "operation" character varying(64) NOT NULL, "request_hash" character varying(64) NOT NULL, "response_body" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_idempotency_keys" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_idempotency_keys_user_operation_key" ON "idempotency_keys" ("user_id", "operation", "key")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_idempotency_keys_user_operation_key"`,
    );
    await queryRunner.query(`DROP TABLE "idempotency_keys"`);
  }
}
