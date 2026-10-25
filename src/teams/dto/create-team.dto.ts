import { IsInt,IsString,IsOptional } from "class-validator";

export class CreateTeamDto {
    @IsInt()
    clubId:number
    
    @IsInt()
    categoryId:number

    @IsString()
    @IsOptional()
    label?:string
}
