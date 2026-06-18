import {
  Controller,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { ListingService } from './listing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UpdateCatalogDto } from '../dtos/listing.dto';
import { User } from '../entities/user.entity';
import { ProviderListingResponse } from '../types';

@Controller('listings')
export class ListingController {
  constructor(private readonly listingService: ListingService) {}

  @Get('providers')
  async getProviders(
    @Query('subcatId') subcatId: string,
  ): Promise<ProviderListingResponse[]> {
    return this.listingService.getProvidersForService(subcatId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('provider')
  @Patch('me/catalog')
  async updateCatalog(
    @Req() req: ExpressRequest,
    @Body() updateDto: UpdateCatalogDto,
  ): Promise<User> {
    // req.user is attached by JwtStrategy
    const userId = (req.user as User).id;
    return this.listingService.updateProviderServices(
      userId,
      updateDto.services,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('provider')
  @Patch('me/status')
  async toggleStatus(@Req() req: ExpressRequest): Promise<User> {
    const userId = (req.user as User).id;
    return this.listingService.toggleProviderStatus(userId);
  }
}
