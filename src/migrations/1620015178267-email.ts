import {MigrationInterface, QueryRunner} from "typeorm";

export class email1620015178267 implements MigrationInterface {
    name = 'email1620015178267'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `users` ADD `email` varchar(255) NOT NULL");
        await queryRunner.query("ALTER TABLE `users` ADD UNIQUE INDEX `IDX_97672ac88f789774dd47f7c8be` (`email`)");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `users` DROP INDEX `IDX_97672ac88f789774dd47f7c8be`");
        await queryRunner.query("ALTER TABLE `users` DROP COLUMN `email`");
    }

}
