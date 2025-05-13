import { IsNotEmpty, IsString, IsOptional, IsArray, IsDateString } from 'class-validator';

export class AddTripDto {
  @IsNotEmpty()
  @IsString()
  destination: string;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  places?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
