import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Club } from '../../clubs/entities/club.entity.js';
import { Category } from '../../categories/entities/category.entity.js';

@Entity('teams')
export class Team {
    @PrimaryGeneratedColumn()
    id:number;

    @Column({nullable:true})
    label: string;

    @ManyToOne(()=>Club, (club)=> club.teams)
    @JoinColumn({name:'club_id'})
    club: Relation<Club>;

    @ManyToOne(()=> Category)
    @JoinColumn({name:'category_id'})
    category:Relation<Category>;
}
