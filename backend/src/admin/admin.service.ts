import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from '../entities/user.entity';
import { Booking } from '../entities/booking.entity';
import { CreateAdminDto } from '../dtos/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  async getStats(): Promise<any> {
    const totalConsumers = await this.userRepository.count({
      where: { role: 'consumer' },
    });
    const totalProviders = await this.userRepository.count({
      where: { role: 'provider' },
    });
    const pendingProviders = await this.userRepository.count({
      where: { role: 'provider', isApproved: false },
    });
    const totalBookings = await this.bookingRepository.count();

    const completedBookings = await this.bookingRepository.find({
      where: { status: 'completed' },
    });
    const totalRevenue = completedBookings.reduce(
      (sum, b) => sum + Number(b.price || 0),
      0,
    );

    return {
      totalConsumers,
      totalProviders,
      pendingProviders,
      totalRevenue,
      totalBookings,
    };
  }

  async toggleProviderApproval(providerId: string): Promise<any> {
    const provider = await this.userRepository.findOne({
      where: { id: providerId, role: 'provider' },
      relations: { listings: true },
    });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    provider.isApproved = !provider.isApproved;
    await this.userRepository.save(provider);
    return provider;
  }

  async toggleUserBlock(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { listings: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role === 'admin') {
      throw new BadRequestException('Cannot block an administrator.');
    }

    user.isBlocked = !user.isBlocked;
    await this.userRepository.save(user);
    return user;
  }

  async getUsersList(): Promise<any[]> {
    const users = await this.userRepository.find({
      order: { name: 'ASC' },
      relations: { listings: true },
    });
    return users;
  }

  async createAdmin(createAdminDto: CreateAdminDto): Promise<User> {
    const { email, name, password } = createAdminDto;
    const emailLower = email.toLowerCase().trim();

    const exists = await this.userRepository.findOne({
      where: { email: emailLower },
    });
    if (exists) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await argon2.hash(password);

    const newAdmin = new User();
    newAdmin.email = emailLower;
    newAdmin.name = name.trim();
    newAdmin.password = hashedPassword;
    newAdmin.role = 'admin';
    newAdmin.isApproved = true;
    newAdmin.isBlocked = false;
    newAdmin.online = false;
    newAdmin.rating = 0;

    return this.userRepository.save(newAdmin);
  }
}
