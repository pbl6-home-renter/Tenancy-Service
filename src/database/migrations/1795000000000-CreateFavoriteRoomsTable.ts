import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFavoriteRoomsTable1795000000000 implements MigrationInterface {
  name = 'CreateFavoriteRoomsTable1795000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE favorite_rooms (
      tenant_id uuid NOT NULL,
      room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_favorite_rooms" PRIMARY KEY (tenant_id, room_id)
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE favorite_rooms');
  }
}
