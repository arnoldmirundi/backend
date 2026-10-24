import { IsInt,IsString,IsOptional } from "class-validator";

export class CreateTeamDto {
    @IsInt()
    clubId:string
    
    @IsInt()
    categoryId:string

    @IsString()
    @IsOptional()
    label?:string
}
