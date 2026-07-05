import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegisterDto, LoginDto, UpdateProfileDto } from '../dtos/auth.dto';
import { UserResponse, LoginResponse } from '../types';
import { UserSerializerInterceptor } from '../interceptors/user-serializer.interceptor';
import { User } from '../entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<UserResponse> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: ExpressRequest): Promise<{ success: boolean; message: string }> {
    await this.authService.logoutFromRequest(req);
    return { success: true, message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@Req() req: ExpressRequest): Promise<{ success: boolean; message: string }> {
    await this.authService.logoutAllFromRequest(req);
    return {
      success: true,
      message: 'Logged out from all devices successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: ExpressRequest): Promise<UserResponse> {
    return this.authService.getProfile(req);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @UseInterceptors(UserSerializerInterceptor)
  async updateProfile(
    @Req() req: ExpressRequest,
    @Body() updateDto: UpdateProfileDto,
  ): Promise<UserResponse> {
    const userId = (req.user as User).id;
    return this.authService.updateProfile(userId, updateDto);
  }
}
