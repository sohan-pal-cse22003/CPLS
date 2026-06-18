import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingService } from './booking.service';
import { BookingEventsService } from './booking-events.service';
import { BookingController } from './booking.controller';
import { Booking } from '../entities/booking.entity';
import { Listing } from '../entities/listing.entity';
import { User } from '../entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Listing, User]), AuthModule],
  controllers: [BookingController],
  providers: [BookingService, BookingEventsService],
  exports: [BookingService],
})
export class BookingModule {}
