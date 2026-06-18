import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  Sse,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingEventsService } from './booking-events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  CreateBookingDto,
  RateBookingDto,
  UpdateBookingStatusDto,
} from '../dtos/booking.dto';
import { User } from '../entities/user.entity';
import { BookingFlatResponse } from '../types';
import type { Request as ExpressRequest } from 'express';
import { Observable, map } from 'rxjs';

@Controller('bookings')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly bookingEventsService: BookingEventsService,
  ) { }

  @Sse('events')
  sse(): Observable<MessageEvent> {
    return this.bookingEventsService.getStream().pipe(
      map((event) => ({
        data: JSON.stringify(event),
      }) as MessageEvent),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getBookings(@Req() req: ExpressRequest): Promise<BookingFlatResponse[]> {
    const user = req.user as User;
    return this.bookingService.getBookings(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('consumer')
  @Post()
  async createBooking(
    @Req() req: ExpressRequest,
    @Body() createDto: CreateBookingDto,
  ): Promise<BookingFlatResponse> {
    const userId = (req.user as User).id;
    return this.bookingService.createBooking(userId, createDto);
  }

  @Get('slots')
  async getBookedSlots(
    @Query('providerId') providerId: string,
    @Query('date') date: string,
  ): Promise<string[]> {
    return this.bookingService.getProviderBookedSlots(providerId, date);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':bookingId/status')
  async updateStatus(
    @Param('bookingId') bookingId: string,
    @Body() updateDto: UpdateBookingStatusDto,
  ): Promise<BookingFlatResponse> {
    return this.bookingService.updateBookingStatus(
      bookingId,
      updateDto.status,
      updateDto.enteredOtp,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('consumer')
  @Post(':bookingId/rate')
  async rateBooking(
    @Req() req: ExpressRequest,
    @Param('bookingId') bookingId: string,
    @Body() ratingDto: RateBookingDto,
  ): Promise<BookingFlatResponse> {
    const userId = (req.user as User).id;
    return this.bookingService.rateBooking(userId, bookingId, ratingDto);
  }
}
