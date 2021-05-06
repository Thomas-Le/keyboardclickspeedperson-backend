import {MigrationInterface, QueryRunner} from "typeorm";

export class highscorePrecision1620276697466 implements MigrationInterface {
    name = 'highscorePrecision1620276697466'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `users` DROP COLUMN `highscore`");
        await queryRunner.query("ALTER TABLE `users` ADD `highscore` decimal(4,1) NOT NULL DEFAULT 0");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `users` DROP COLUMN `highscore`");
        await queryRunner.query("ALTER TABLE `users` ADD `highscore` int NOT NULL DEFAULT '0'");
    }

}
