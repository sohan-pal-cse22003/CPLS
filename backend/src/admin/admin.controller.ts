import { Controller, Get, Patch, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserSerializerInterceptor } from 'src/interceptors/user-serializer.interceptor';


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

  @Patch('providers/:providerId/approve')
  async approveProvider(@Param('providerId') providerId: string) {
    return this.adminService.toggleProviderApproval(providerId);
  }

  @Patch('users/:userId/block')
  async blockUser(@Param('userId') userId: string) {
    return this.adminService.toggleUserBlock(userId);
  }
}
