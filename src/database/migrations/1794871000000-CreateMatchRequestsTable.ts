import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMatchRequestsTable1794871000000 implements MigrationInterface {
  name = 'CreateMatchRequestsTable1794871000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "match_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "requester_id" uuid NOT NULL, "target_id" uuid NOT NULL, "pair_low_id" uuid NOT NULL, "pair_high_id" uuid NOT NULL, "idempotency_key" uuid NOT NULL, "status" character varying(16) NOT NULL, "responded_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_match_requests_responded_at" CHECK ((status = 'pending' AND responded_at IS NULL) OR (status <> 'pending' AND responded_at IS NOT NULL)), CONSTRAINT "CHK_match_requests_pair_order" CHECK (pair_low_id < pair_high_id), CONSTRAINT "CHK_match_requests_status" CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')), CONSTRAINT "PK_7349a97326e887defffe4531598" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_match_requests_target_created" ON "match_requests"  ("target_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_match_requests_requester_created" ON "match_requests"  ("requester_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_match_requests_pending_pair" ON "match_requests"  ("pair_low_id", "pair_high_id") WHERE status = 'pending' AND is_deleted = false`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_match_requests_request_key" ON "match_requests"  ("requester_id", "idempotency_key") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_match_requests_request_key"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_match_requests_pending_pair"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_match_requests_requester_created"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_match_requests_target_created"`,
    );
    await queryRunner.query(`DROP TABLE "match_requests"`);
  }
}
