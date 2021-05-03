import {MigrationInterface, QueryRunner} from "typeorm";

export class highscore1620073501332 implements MigrationInterface {
    name = 'highscore1620073501332'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `users` CHANGE `highscore` `highscore` int NOT NULL DEFAULT 0");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `users` CHANGE `highscore` `highscore` int NOT NULL");
    }

}
