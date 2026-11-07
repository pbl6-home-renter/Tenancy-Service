import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMediaReferenceColumns1794022178900 implements MigrationInterface {
  name = 'AddMediaReferenceColumns1794022178900';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rooms" ADD "photo_media_ids" uuid array NOT NULL DEFAULT '{}'::uuid[]`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "signed_contract_media_ids" uuid array NOT NULL DEFAULT '{}'::uuid[]`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN "signed_contract_media_ids"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rooms" DROP COLUMN "photo_media_ids"`,
    );
  }
}
