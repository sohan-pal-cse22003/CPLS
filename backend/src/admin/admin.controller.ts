import { Controller, Get, Post, Patch, Body, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserSerializerInterceptor } from 'src/interceptors/user-serializer.interceptor';
import { CreateAdminDto } from '../dtos/admin.dto';


@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @UseInterceptors(UserSerializerInterceptor)
  async getUsers() {
    return this.adminService.getUsersList();
  }

  @Post('create-admin')
  @UseInterceptors(UserSerializerInterceptor)
  async createAdmin(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.createAdmin(createAdminDto);
  }

  @Patch('providers/:providerId/approve')
  async approveProvider(@Param('providerId') providerId: string) {
    return this.adminService.toggleProviderApproval(providerId);
  }

  @Patch('users/:userId/block')
  async blockUser(@Param('userId') userId: string) {
    return this.adminService.toggleUserBlock(userId);
  }
}
