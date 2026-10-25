import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Team } from '../../teams/entities/team.entity.js';

@Entity('clubs')
@Index(['name'], {unique:true})
export class Club {
    @PrimaryGeneratedColumn()
    id:number
    @Column()
    name:string
    @Column({type:'varchar', nullable:true})
    logo: string | null
    @Column({type:'varchar', nullable:true})
    country: string | null;
    @Column({type:'varchar', nullable:true})
    kitPrimary: string | null;
    @Column({type:'varchar', nullable:true})
    kitSecondary: string | null;



    @OneToMany(()=> Team, (team)=> team.club)
    teams: Relation<Team[]>;
}
