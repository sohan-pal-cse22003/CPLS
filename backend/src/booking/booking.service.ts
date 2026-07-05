import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { Listing } from '../entities/listing.entity';
import { User } from '../entities/user.entity';
import { CreateBookingDto, RateBookingDto } from '../dtos/booking.dto';
import { BookingFlatResponse } from '../types';
import { BookingEventsService } from './booking-events.service';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly bookingEventsService: BookingEventsService,
  ) { }

  generateOtp(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  private mapBookingFlat(b: Booking | null): BookingFlatResponse | null {
    if (!b) return null;
    return {
      id: b.id,
      consumerId: b.consumerId,
      consumerName: b.consumer ? b.consumer.name : 'Unknown Consumer',
      providerId:
        b.listing && b.listing.provider ? b.listing.provider.id : null,
      providerName:
        b.listing && b.listing.provider
          ? b.listing.provider.name
          : 'Unknown Provider',
      category: b.listing ? b.listing.cat_id : null,
      subcategoryId: b.listing ? b.listing.subcat_id : null,
      subcategoryName:
        b.listing && b.listing.subcategory
          ? b.listing.subcategory.name
          : 'Unknown Service',
      price: b.price
        ? Number(b.price)
        : b.listing
          ? Number(b.listing.price)
          : 0,
      date: b.date,
      time: b.time,
      address: b.address,
      status: b.status,
      rating: b.rating,
      comment: b.comment,
      otp: b.otp || null,
    };
  }

  async getBookings(user: User): Promise<BookingFlatResponse[]> {
    const query = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.consumer', 'consumer')
      .leftJoinAndSelect('booking.listing', 'listing')
      .leftJoinAndSelect('listing.provider', 'provider')
      .leftJoinAndSelect('listing.subcategory', 'subcategory');

    if (user.role === 'provider') {
      query.where('provider.id = :providerId', { providerId: user.id });
    } else if (user.role === 'consumer') {
      query.where('booking.consumerId = :consumerId', { consumerId: user.id });
    }

    const bookings = await query.orderBy('booking.id', 'DESC').getMany();
    return bookings
      .map((b) => this.mapBookingFlat(b))
      .filter(Boolean) as BookingFlatResponse[];
  }

  async createBooking(
    consumerId: string,
    createDto: CreateBookingDto,
  ): Promise<BookingFlatResponse> {
    const { subcategoryId, providerId, price, date, time, address } = createDto;

    const listing = await this.listingRepository.findOne({
      where: { provider_id: providerId, subcat_id: subcategoryId },
      relations: { provider: true, subcategory: true },
    });

    if (!listing) {
      throw new NotFoundException(
        'Selected service provider listing not found',
      );
    }

    if (
      !listing.provider ||
      !listing.provider.online ||
      !listing.provider.isApproved ||
      listing.provider.isBlocked
    ) {
      throw new BadRequestException(
        'Selected provider is currently unavailable',
      );
    }

    // Check if slot is already booked and confirmed by this provider
    const existingConfirmedBooking = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('booking.listing', 'listing')
      .where('listing.provider_id = :providerId', { providerId })
      .andWhere('booking.date = :date', { date })
      .andWhere('booking.time = :time', { time })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: ['accepted', 'in-progress', 'completed'],
      })
      .getOne();

    if (existingConfirmedBooking) {
      throw new BadRequestException(
        'This time slot is already booked and confirmed by the provider.',
      );
    }

    const consumer = await this.userRepository.findOne({ where: { id: consumerId } });
    if (!consumer) {
      throw new NotFoundException('Consumer not found');
    }

    const booking = new Booking();
    booking.consumerId = consumerId;
    booking.listing = listing;
    booking.listing_id = listing.id;
    booking.date = date;
    booking.time = time;
    booking.address = address;
    booking.status = 'pending';
    booking.price = price && Number(price) > 0 ? Number(price) : Number(listing.price);
    booking.rating = 0;
    booking.comment = '';
    // assign otp
    booking.otp = consumer.otp;
    // Optionally, you could also store OTP on the consumer user if needed, but it's not required for display after acceptance.


    const saved = await this.bookingRepository.save(booking);

    const completeBooking = await this.bookingRepository.findOne({
      where: { id: saved.id },
      relations: {
        consumer: true,
        listing: {
          provider: true,
          subcategory: true,
        },
      },
    });

    const flat = this.mapBookingFlat(completeBooking);
    if (!flat) {
      throw new BadRequestException('Booking creation failed');
    }
    this.bookingEventsService.emit({ type: 'created', booking: flat });
    return flat;
  }

  async getProviderBookedSlots(
    providerId: string,
    date: string,
  ): Promise<string[]> {
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('booking.listing', 'listing')
      .where('listing.provider_id = :providerId', { providerId })
      .andWhere('booking.date = :date', { date })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: ['accepted', 'in-progress', 'completed'],
      })
      .getMany();

    return bookings.map((b) => b.time);
  }

  async updateBookingStatus(
    bookingId: string,
    status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled',
    enteredOtp?: string,
  ): Promise<BookingFlatResponse> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: {
        consumer: true,
        listing: {
          provider: true,
          subcategory: true,
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (status === 'accepted') {
      // OTP was generated during booking creation and stored in booking.otp.
      // No need to modify it here.
    } else if (status === 'in-progress') {
      if (!enteredOtp) {
        throw new BadRequestException('OTP is required to start this service.');
      }
      if (booking.otp && enteredOtp !== booking.otp) {
        throw new BadRequestException(
          'Invalid OTP. Please ask the consumer for the correct OTP.',
        );
      }
    }

    booking.status = status;
    const saved = await this.bookingRepository.save(booking);

    const flat = this.mapBookingFlat(saved);
    if (!flat) {
      throw new BadRequestException('Booking status update failed');
    }
    this.bookingEventsService.emit({ type: 'status_updated', booking: flat });
    return flat;
  }

  async rateBooking(
    consumerId: string,
    bookingId: string,
    ratingDto: RateBookingDto,
  ): Promise<BookingFlatResponse> {
    const { rating, comment } = ratingDto;

    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId, consumerId },
      relations: {
        consumer: true,
        listing: {
          provider: true,
          subcategory: true,
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found or not created by you');
    }

    if (booking.status !== 'completed') {
      throw new BadRequestException('You can only rate completed bookings');
    }

    booking.rating = Number(rating);
    booking.comment = comment || '';
    const saved = await this.bookingRepository.save(booking);

    // Recalculate provider average rating
    const provider = booking.listing?.provider;
    if (provider) {
      const allProviderBookings = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.listing', 'listing')
        .where('listing.provider_id = :providerId', { providerId: provider.id })
        .andWhere('booking.status = :status', { status: 'completed' })
        .andWhere('booking.rating > 0')
        .getMany();

      if (allProviderBookings.length > 0) {
        const sum = allProviderBookings.reduce(
          (acc, curr) => acc + curr.rating,
          0,
        );
        provider.rating = parseFloat(
          (sum / allProviderBookings.length).toFixed(1),
        );
        await this.userRepository.save(provider);
      }
    }

    const flat = this.mapBookingFlat(saved);
    if (!flat) {
      throw new BadRequestException('Booking rating failed');
    }
    this.bookingEventsService.emit({ type: 'rated', booking: flat });
    return flat;
  }
}
