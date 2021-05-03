import {MigrationInterface, QueryRunner} from "typeorm";

export class UniqueUser1619935668002 implements MigrationInterface {
    name = 'UniqueUser1619935668002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `users` ADD UNIQUE INDEX `IDX_fe0bb3f6520ee0469504521e71` (`username`)");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `users` DROP INDEX `IDX_fe0bb3f6520ee0469504521e71`");
    }

}
