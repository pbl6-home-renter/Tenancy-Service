import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestoreContractTemplateKey1794997658232 implements MigrationInterface {
  name = 'RestoreContractTemplateKey1794997658232';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "template_key" character varying(100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN "template_key"`,
    );
  }
}
