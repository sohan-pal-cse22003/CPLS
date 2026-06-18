import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Request as ExpressRequest } from 'express';
import * as argon2 from 'argon2';
import { User } from '../entities/user.entity';
import { Listing } from '../entities/listing.entity';
import { Subcategory } from '../entities/subcategory.entity';
import { TokenList } from '../entities/token-list.entity';
import { RegisterDto, LoginDto } from '../dtos/auth.dto';

@Injectable()
export class AuthService {
  // Existing constructor and methods remain unchanged
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
    @InjectRepository(Subcategory)
    private subcategoryRepository: Repository<Subcategory>,
    @InjectRepository(TokenList)
    private tokenListRepository: Repository<TokenList>,
    private jwtService: JwtService,
  ) {}

  generateOtp(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  async register(registerDto: RegisterDto): Promise<User> {
    const { email, name, password, role, services } = registerDto;
    const emailLower = email.toLowerCase().trim();

    const exists = await this.userRepository.findOne({
      where: { email: emailLower },
    });
    if (exists) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await argon2.hash(password);

    const newUser = new User();
    newUser.email = emailLower;
    newUser.name = name.trim();
    newUser.password = hashedPassword;
    newUser.role = role;
    newUser.online = role === 'provider';
    newUser.isApproved = role !== 'provider';
    newUser.isBlocked = false;
    newUser.rating = 0;

    if (role === 'consumer') {
      newUser.otp = this.generateOtp();
    }

    const savedUser = await this.userRepository.save(newUser);

    // If registering as a provider, create initial listings
    if (role === 'provider' && Array.isArray(services) && services.length > 0) {
      for (const service of services) {
        const subcat = await this.subcategoryRepository.findOne({
          where: { id: service.id },
        });
        if (subcat) {
          const listing = new Listing();
          listing.provider_id = savedUser.id;
          listing.cat_id = subcat.cat_id;
          listing.subcat_id = subcat.id;
          listing.price = service.price ? Number(service.price) : subcat.price;
          listing.time_required = subcat.time;
          await this.listingRepository.save(listing);
        }
      }
    }

    // Fetch user with listings to map
    const completeUser = await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: { listings: true },
    });

    if (!completeUser) {
      throw new ConflictException('User registration failed');
    }

    return completeUser;
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ success: boolean; accessToken: string; user: User }> {
    const { email, password } = loginDto;
    const emailLower = email.toLowerCase().trim();

    const user = await this.userRepository.findOne({
      where: { email: emailLower },
      relations: { listings: true },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.isBlocked) {
      throw new UnauthorizedException(
        'Your account has been blocked by the administrator.',
      );
    }

    if (!user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await argon2.verify(user.password, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    // Save to whitelist token list table
    const tokenRecord = new TokenList();
    tokenRecord.token = accessToken;
    tokenRecord.userId = user.id;
    await this.tokenListRepository.save(tokenRecord);

    return {
      success: true,
      accessToken,
      user,
    };
  }

  async logout(token: string): Promise<void> {
    await this.tokenListRepository.delete({ token });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.tokenListRepository.delete({ userId });
  }

  // New helper methods to handle request objects
  async logoutFromRequest(req: ExpressRequest): Promise<void> {
    const authHeader = req.headers?.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        await this.logout(token);
      }
    }
  }

  async logoutAllFromRequest(req: ExpressRequest): Promise<void> {
    const userId = (req as any).user?.id;
    if (userId) {
      await this.logoutAll(userId);
    }
  }

  async getProfile(req: ExpressRequest): Promise<any> {
    return (req as any).user;
  }
}
