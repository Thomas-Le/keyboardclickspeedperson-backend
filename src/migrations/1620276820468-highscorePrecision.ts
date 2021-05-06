import {MigrationInterface, QueryRunner} from "typeorm";

export class highscorePrecision1620276820468 implements MigrationInterface {
    name = 'highscorePrecision1620276820468'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `users` CHANGE `highscore` `highscore` decimal(8,2) NOT NULL DEFAULT 0");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `users` CHANGE `highscore` `highscore` decimal(4,1) NOT NULL DEFAULT '0.0'");
    }

}
