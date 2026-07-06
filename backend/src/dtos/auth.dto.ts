import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsArray,
  IsOptional,
  ValidateNested,
  IsNumber,
  isStrongPassword,
  IsStrongPassword
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
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @IsStrongPassword({ minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 }, {
    message: 'Password must contain 1 lower 1 upper case letter and 1 symbol and 1 number'
  })
  password: string;

  @IsEnum(['provider', 'consumer'], {
    message: 'Invalid role selection',
  })
  role: 'provider' | 'consumer';

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

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name?: string;

  @IsEmail({}, { message: 'Please enter a valid email address' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @IsStrongPassword({ minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 }, {
    message: 'Password must contain 1 lower 1 upper case letter and 1 symbol and 1 number'
  })
  password?: string;
}
