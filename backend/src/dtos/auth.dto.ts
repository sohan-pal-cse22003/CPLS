import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsArray,
  IsOptional,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProviderServiceDto {
  @IsString()
  id: string;

  @IsNumber()
  @IsOptional()
  price?: number;
}

export class RegisterDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsEnum(['admin', 'provider', 'consumer'], {
    message: 'Invalid role selection',
  })
  role: 'admin' | 'provider' | 'consumer';

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProviderServiceDto)
  services?: ProviderServiceDto[];
}

export class LoginDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @IsString()
  password: string;
}
