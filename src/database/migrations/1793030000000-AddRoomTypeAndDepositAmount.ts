import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoomTypeAndDepositAmount1793030000000 implements MigrationInterface {
  name = 'AddRoomTypeAndDepositAmount1793030000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rooms" ADD "deposit_amount" numeric(12,0) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "rooms" ADD CONSTRAINT "CHK_rooms_deposit_amount" CHECK ("deposit_amount" >= 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rooms" DROP CONSTRAINT "CHK_rooms_deposit_amount"`,
    );
    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "deposit_amount"`);
  }
}
