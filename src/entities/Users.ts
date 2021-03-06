import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Users extends BaseEntity {
    // Should probably make it string UUID, but this is just sample case
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    email: string;

    @Column({ unique: true })
    username: string;

    @Column()
    hashedPassword: string;

    @Column("decimal", { precision: 8, scale: 2, default: 0 })
    highscore: number;
}