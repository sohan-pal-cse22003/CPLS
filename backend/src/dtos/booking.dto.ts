import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  category: string;

  @IsString()
  @IsNotEmpty({ message: 'Subcategory ID is required' })
  subcategoryId: string;

  @IsString()
  @IsNotEmpty({ message: 'Provider ID is required' })
  providerId: string;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Price must be a positive number' })
  @Transform(({ value }) => value !== undefined && value !== null ? Number(value) : undefined)
  price?: number;

  @IsString()
  @IsNotEmpty({ message: 'Date is required' })
  date: string;

  @IsString()
  @IsNotEmpty({ message: 'Time slot is required' })
  time: string;

  @IsString()
  @IsNotEmpty({ message: 'Delivery address is required' })
  address: string;
}

export class RateBookingDto {
  @IsNumber()
  @Min(1, { message: 'Rating must be at least 1' })
  @Max(5, { message: 'Rating cannot exceed 5' })
  rating: number;

  @IsString()
  @IsNotEmpty({ message: 'Comment is required' })
  comment: string;
}

export class UpdateBookingStatusDto {
  @IsEnum(['pending', 'accepted', 'in-progress', 'completed', 'cancelled'], {
    message: 'Invalid booking status transition',
  })
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';

  @IsString()
  @IsOptional()
  enteredOtp?: string;
}
