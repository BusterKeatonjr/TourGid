import { IsNotEmpty, IsString, IsOptional, IsArray, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PlaceDto {
  @IsString()
  name: string;

  @IsArray()
  coords: [number, number];

  @IsOptional()
  @IsString()
  type?: string;
}

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
  @ValidateNested({ each: true })
  @Type(() => PlaceDto)
  points?: PlaceDto[];

  @IsOptional()
  @IsArray()
  places?: string[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
