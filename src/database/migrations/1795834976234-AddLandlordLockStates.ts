import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLandlordLockStates1795834976234 implements MigrationInterface {
  name = 'AddLandlordLockStates1795834976234';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "landlord_lock_states" ("user_id" uuid NOT NULL, "locked_at" TIMESTAMP WITH TIME ZONE NOT NULL, "is_locked" boolean NOT NULL, CONSTRAINT "PK_1196a8a13607b9de21f8d068372" PRIMARY KEY ("user_id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "landlord_lock_states"`);
  }
}
