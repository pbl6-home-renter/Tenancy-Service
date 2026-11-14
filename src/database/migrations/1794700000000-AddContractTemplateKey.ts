import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContractTemplateKey1794700000000 implements MigrationInterface {
  name = 'AddContractTemplateKey1794700000000';

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
