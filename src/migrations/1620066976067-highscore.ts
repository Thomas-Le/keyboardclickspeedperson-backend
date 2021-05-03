import {MigrationInterface, QueryRunner} from "typeorm";

export class highscore1620066976067 implements MigrationInterface {
    name = 'highscore1620066976067'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `users` ADD `highscore` int NOT NULL");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `users` DROP COLUMN `highscore`");
    }

}
