import {IsIn} from 'class-validator';

export class CreateCategoryDto {
    @IsIn(['Boys', 'Girls'])
    section: string
    
    @IsIn(['U6','U8', 'U10', 'U12', 'U15', 'U17'])
    ageGroup:string

}
