import {Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';


@Entity('categories')
@Index(['section', 'ageGroup'], {unique:true})
export class Category {
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    section:string;
    @Column()
    ageGroup:string
}
