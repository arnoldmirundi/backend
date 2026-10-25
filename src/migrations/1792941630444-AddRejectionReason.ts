import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRejectionReason1792941630444 implements MigrationInterface {
    name = 'AddRejectionReason1792941630444'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "registration" ADD "rejectionReason" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "registration" DROP COLUMN "rejectionReason"`);
    }

}
