import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1780933227443 implements MigrationInterface {
    name = 'InitSchema1780933227443'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "listings" ADD CONSTRAINT "UQ_1a76b71766f7c9d2deddd8160d5" UNIQUE ("subcat_id", "provider_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "listings" DROP CONSTRAINT "UQ_1a76b71766f7c9d2deddd8160d5"`);
    }

}
