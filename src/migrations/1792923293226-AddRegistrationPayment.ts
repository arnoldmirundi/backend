import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRegistrationPayment1792923293226 implements MigrationInterface {
    name = 'AddRegistrationPayment1792923293226'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "registration" ("id" SERIAL NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "paymentStatus" character varying NOT NULL DEFAULT 'unpaid', "amountDue" integer NOT NULL DEFAULT '0', "paidAt" TIMESTAMP WITH TIME ZONE, "clubName" character varying NOT NULL, "country" character varying NOT NULL, "logo" character varying, "kitPrimary" character varying, "kitSecondary" character varying, "contactName" character varying NOT NULL, "contactRole" character varying NOT NULL, "contactEmail" character varying NOT NULL, "contactPhone" character varying NOT NULL, "entries" jsonb NOT NULL, "notes" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "reviewedAt" TIMESTAMP WITH TIME ZONE, "clubId" integer, CONSTRAINT "PK_cb23dc9d28df8801b15e9e2b8d6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "clubs" ADD "country" character varying`);
        await queryRunner.query(`ALTER TABLE "clubs" ADD "kitPrimary" character varying`);
        await queryRunner.query(`ALTER TABLE "clubs" ADD "kitSecondary" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "clubs" DROP COLUMN "kitSecondary"`);
        await queryRunner.query(`ALTER TABLE "clubs" DROP COLUMN "kitPrimary"`);
        await queryRunner.query(`ALTER TABLE "clubs" DROP COLUMN "country"`);
        await queryRunner.query(`DROP TABLE "registration"`);
    }

}
