import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty({ message: 'Category name is required' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Category icon is required' })
  icon: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateSubcategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'Subcategory name is required' })
  name: string;

  @IsNumber()
  @Min(0, { message: 'Subcategory price must be non-negative' })
  price: number;

  @IsString()
  @IsOptional()
  time?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
