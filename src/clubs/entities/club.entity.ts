import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Team } from '../../teams/entities/team.entity.js';

@Entity('clubs')
@Index(['name'], {unique:true})
export class Club {
    @PrimaryGeneratedColumn()
    id:number
    @Column()
    name:string
    @OneToMany(()=> Team, (team)=> team.club)
    teams: Relation<Team[]>;
}
