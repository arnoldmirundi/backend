import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateClubDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsString()
    logo?: string;
}
