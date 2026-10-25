import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize, IsArray, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUrl,
  Length, Matches, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';

export const SECTIONS = ['Boys', 'Girls'];
export const AGE_GROUPS = ['U6', 'U8', 'U10', 'U12', 'U15', 'U17'];
export const CONTACT_ROLES = ['Coach', 'Administrator', 'Other'];

export class RegistrationEntryDto {
  @IsIn(SECTIONS)
  readonly section: string;

  @IsIn(AGE_GROUPS)
  readonly ageGroup: string;

  @IsInt()
  @Min(1)
  @Max(4)
  readonly count: number;
}

export class CreateRegistrationDto {
  @IsString() @Length(2, 100)
  readonly clubName: string;

  @IsString() @Length(2, 60)
  readonly country: string;

  @IsOptional() @IsUrl()
  readonly logo?: string;

  @IsOptional() @IsString() @MaxLength(30)
  readonly kitPrimary?: string;

  @IsOptional() @IsString() @MaxLength(30)
  readonly kitSecondary?: string;

  @IsString() @Length(2, 100)
  readonly contactName: string;

  @IsIn(CONTACT_ROLES)
  readonly contactRole: string;

  @IsEmail()
  readonly contactEmail: string;

  @Matches(/^\+?[0-9 ()-]{7,20}$/, { message: 'contactPhone must be a valid phone number' })
  readonly contactPhone: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => RegistrationEntryDto)
  readonly entries: RegistrationEntryDto[];

  @IsOptional() @IsString() @MaxLength(1000)
  readonly notes?: string;
}