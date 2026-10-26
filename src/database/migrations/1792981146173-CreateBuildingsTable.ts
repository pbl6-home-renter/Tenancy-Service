import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBuildingsTable1792981146173 implements MigrationInterface {
  name = 'CreateBuildingsTable1792981146173';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."buildings_status_enum" AS ENUM('pending', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "buildings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "landlord_id" uuid NOT NULL, "name" character varying(254) NOT NULL, "province" character varying(100) NOT NULL, "ward" character varying(100) NOT NULL, "address" character varying(254) NOT NULL, "latitude" numeric(9,6) NOT NULL, "longitude" numeric(9,6) NOT NULL, "status" "public"."buildings_status_enum" NOT NULL DEFAULT 'pending', "reviewed_by" uuid, "reviewed_at" TIMESTAMP WITH TIME ZONE, "note" text, CONSTRAINT "CHK_buildings_note" CHECK ((note IS NULL OR (char_length(btrim(note)) >= 1 AND char_length(note) <= 500)) AND (status <> 'rejected' OR note IS NOT NULL)), CONSTRAINT "CHK_buildings_longitude" CHECK (longitude BETWEEN -180 AND 180), CONSTRAINT "CHK_buildings_latitude" CHECK (latitude BETWEEN -90 AND 90), CONSTRAINT "CHK_buildings_address" CHECK (char_length(btrim(address)) >= 1), CONSTRAINT "CHK_buildings_ward" CHECK (char_length(btrim(ward)) >= 1), CONSTRAINT "CHK_buildings_province" CHECK (char_length(btrim(province)) >= 1), CONSTRAINT "CHK_buildings_name" CHECK (char_length(btrim(name)) >= 1), CONSTRAINT "PK_bc65c1acce268c383e41a69003a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_buildings_status" ON "buildings"  ("status") WHERE is_deleted = false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_buildings_landlord" ON "buildings"  ("landlord_id") WHERE is_deleted = false`,
    );
    await queryRunner.query(
      `CREATE TABLE "processed_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "message_id" uuid NOT NULL, "event_type" character varying(150) NOT NULL, "processed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a08d68aa0747daea9efd2ddea53" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_processed_events_message_id" ON "processed_events"  ("message_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "samples" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "title" character varying(255) NOT NULL, "description" text, CONSTRAINT "PK_d68b5b3bd25a6851b033fb63444" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "outbox_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "sequence" BIGSERIAL NOT NULL, "aggregate_type" character varying(100) NOT NULL, "aggregate_id" uuid NOT NULL, "event_type" character varying(150) NOT NULL, "routing_key" character varying(150) NOT NULL, "payload" jsonb NOT NULL, "headers" jsonb, "status" character varying(20) NOT NULL DEFAULT 'PENDING', "retry_count" integer NOT NULL DEFAULT '0', "available_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "claimed_at" TIMESTAMP WITH TIME ZONE, "processed_at" TIMESTAMP WITH TIME ZONE, "last_error" text, CONSTRAINT "PK_0171348f527c64b137e4d4f5b66" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbox_status_processed" ON "outbox_messages"  ("status", "processed_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbox_aggregate_sequence" ON "outbox_messages"  ("aggregate_id", "sequence") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbox_status_available" ON "outbox_messages"  ("status", "available_at") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_outbox_status_available"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_outbox_aggregate_sequence"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_outbox_status_processed"`,
    );
    await queryRunner.query(`DROP TABLE "outbox_messages"`);
    await queryRunner.query(`DROP TABLE "samples"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_processed_events_message_id"`,
    );
    await queryRunner.query(`DROP TABLE "processed_events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_buildings_landlord"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_buildings_status"`);
    await queryRunner.query(`DROP TABLE "buildings"`);
    await queryRunner.query(`DROP TYPE "public"."buildings_status_enum"`);
  }
}
