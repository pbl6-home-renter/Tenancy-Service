import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRoomsTable1793020000000 implements MigrationInterface {
  name = 'CreateRoomsTable1793020000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."room_gender_policy_enum" AS ENUM('any', 'male', 'female')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."room_status_enum" AS ENUM('available', 'occupied', 'maintenance')`,
    );
    await queryRunner.query(
      `CREATE TABLE "rooms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "landlord_id" uuid NOT NULL, "building_id" uuid NOT NULL, "floor_number" integer, "name" character varying(254) NOT NULL, "description" text, "area" numeric, "amenities" jsonb NOT NULL DEFAULT '{}'::jsonb, "max_occupancy" integer, "gender_policy" "public"."room_gender_policy_enum" NOT NULL DEFAULT 'any', "rent_price" numeric NOT NULL, "status" "public"."room_status_enum" NOT NULL DEFAULT 'available', CONSTRAINT "CHK_rooms_amenities_object" CHECK (jsonb_typeof(amenities) = 'object'), CONSTRAINT "CHK_rooms_rent_price" CHECK (rent_price >= 0), CONSTRAINT "CHK_rooms_max_occupancy" CHECK (max_occupancy IS NULL OR max_occupancy > 0), CONSTRAINT "CHK_rooms_area" CHECK (area IS NULL OR area > 0), CONSTRAINT "CHK_rooms_floor_number" CHECK (floor_number IS NULL OR floor_number > 0), CONSTRAINT "CHK_rooms_description" CHECK (description IS NULL OR char_length(description) BETWEEN 1 AND 500), CONSTRAINT "CHK_rooms_name" CHECK (char_length(name) >= 1), CONSTRAINT "FK_rooms_building" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "PK_rooms" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rooms_landlord" ON "rooms" ("landlord_id") WHERE is_deleted = false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rooms_building" ON "rooms" ("building_id") WHERE is_deleted = false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rooms_status" ON "rooms" ("status") WHERE is_deleted = false`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_rooms_building_name_active" ON "rooms" ("building_id", "name") WHERE is_deleted = false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_rooms_building_name_active"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_rooms_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_rooms_building"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_rooms_landlord"`);
    await queryRunner.query(`DROP TABLE "rooms"`);
    await queryRunner.query(`DROP TYPE "public"."room_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."room_gender_policy_enum"`);
  }
}
