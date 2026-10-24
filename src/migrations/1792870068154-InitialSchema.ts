import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1792870068154 implements MigrationInterface {
    name = 'InitialSchema1792870068154'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "categories" ("id" SERIAL NOT NULL, "section" character varying NOT NULL, "ageGroup" character varying NOT NULL, CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e23e9a01ab9e03b8223eac0474" ON "categories"  ("section", "ageGroup") `);
        await queryRunner.query(`CREATE TABLE "teams" ("id" SERIAL NOT NULL, "label" character varying, "club_id" integer, "category_id" integer, CONSTRAINT "PK_7e5523774a38b08a6236d322403" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "clubs" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "logo" character varying, CONSTRAINT "PK_bb09bd0c8d5238aeaa8f86ee0d4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5faeec2f663968ba35f61fe46d" ON "clubs"  ("name") `);
        await queryRunner.query(`ALTER TABLE "teams" ADD CONSTRAINT "FK_1034f9348677bb0cc2d677a970a" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "teams" ADD CONSTRAINT "FK_086f833532ccfe553e986c85f53" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "teams" DROP CONSTRAINT "FK_086f833532ccfe553e986c85f53"`);
        await queryRunner.query(`ALTER TABLE "teams" DROP CONSTRAINT "FK_1034f9348677bb0cc2d677a970a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5faeec2f663968ba35f61fe46d"`);
        await queryRunner.query(`DROP TABLE "clubs"`);
        await queryRunner.query(`DROP TABLE "teams"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e23e9a01ab9e03b8223eac0474"`);
        await queryRunner.query(`DROP TABLE "categories"`);
    }

}
