import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { Category } from './entities/category.entity';
import { Subcategory } from './entities/subcategory.entity';
import { User } from './entities/user.entity';
import { Listing } from './entities/listing.entity';
import { SEED_CATEGORIES, SEED_PROVIDERS } from './constants/dummy-data';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Subcategory)
    private subcategoryRepository: Repository<Subcategory>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
  ) {}

  getHello(): string {
    return 'CPLS Home Services API is running!';
  }

  async onApplicationBootstrap() {
    this.logger.log('Checking database status for seeding...');
    try {
      const categoryCount = await this.categoryRepository.count();
      if (categoryCount === 0) {
        this.logger.log('Database is empty. Seeding initial data...');
        await this.seed();
        this.logger.log('Database seeding completed successfully!');
      } else {
        this.logger.log('Database already contains data. Skipping seed.');
      }
    } catch (error) {
      this.logger.error('Error during database seeding check:', error);
    }
  }

  private async seed() {
    const subcatMap = new Map<string, Subcategory>();

    // 1. Seed Categories & Subcategories
    for (const catData of SEED_CATEGORIES) {
      const category = new Category();
      category.name = catData.name;
      category.icon = catData.icon;
      category.description = catData.description;
      const savedCategory = await this.categoryRepository.save(category);

      for (const subData of catData.subcategories) {
        const subcat = new Subcategory();
        subcat.name = subData.name;
        subcat.price = subData.price;
        subcat.time = subData.time;
        subcat.description = subData.description;
        subcat.cat_id = savedCategory.id;
        const savedSub = await this.subcategoryRepository.save(subcat);

        // Save using clean lower-case slug as lookup key
        const slug = subData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        subcatMap.set(slug, savedSub);
      }
    }

    // 2. Seed Users
    const hashedPasswordAdmin = await argon2.hash('admin');
    const hashedPasswordProvider = await argon2.hash('provider');
    const hashedPasswordConsumer = await argon2.hash('consumer');

    // Admin
    const admin = new User();
    admin.email = 'admin@service.com';
    admin.name = 'System Admin';
    admin.password = hashedPasswordAdmin;
    admin.role = 'admin';
    admin.isApproved = true;
    admin.isBlocked = false;
    admin.online = false;
    admin.rating = 0;
    await this.userRepository.save(admin);

    // Consumer
    const consumer = new User();
    consumer.email = 'consumer@service.com';
    consumer.name = 'Amit Verma';
    consumer.password = hashedPasswordConsumer;
    consumer.role = 'consumer';
    consumer.isApproved = true;
    consumer.isBlocked = false;
    consumer.online = false;
    consumer.otp = '4321';
    consumer.rating = 0;
    await this.userRepository.save(consumer);

    // Helper function to find a matching subcategory from map by fuzzy slug match
    const getSubcatBySlug = (slug: string): Subcategory | undefined => {
      if (subcatMap.has(slug)) return subcatMap.get(slug);

      // Handle special naming conventions like "&" replacement
      if (slug.includes('drill---mounting')) {
        return (
          subcatMap.get('drill---mounting') ||
          Array.from(subcatMap.entries()).find(([k]) =>
            k.includes('drill'),
          )?.[1]
        );
      }
      if (slug.includes('tap---shower-fitment')) {
        return (
          subcatMap.get('tap---shower-fitment') ||
          Array.from(subcatMap.entries()).find(([k]) => k.includes('tap'))?.[1]
        );
      }

      // Fallback: search key containing original slug text
      const cleanSlug = slug.replace(/^-+|-+$/g, '');
      const match = Array.from(subcatMap.entries()).find(
        ([k]) => k.includes(cleanSlug) || cleanSlug.includes(k),
      );
      return match ? match[1] : undefined;
    };

    // Providers
    for (const provData of SEED_PROVIDERS) {
      const provider = new User();
      provider.email = provData.email;
      provider.name = provData.name;
      provider.password = hashedPasswordProvider;
      provider.role = 'provider';
      provider.isApproved = provData.isApproved;
      provider.isBlocked = false;
      provider.online = provData.online;
      provider.rating = provData.rating;
      const savedProvider = await this.userRepository.save(provider);

      for (const service of provData.services) {
        const subcat = getSubcatBySlug(service.slug);
        if (subcat) {
          const listing = new Listing();
          listing.provider_id = savedProvider.id;
          listing.cat_id = subcat.cat_id;
          listing.subcat_id = subcat.id;
          listing.price =
            service.price !== null ? Number(service.price) : subcat.price;
          listing.time_required = subcat.time;
          await this.listingRepository.save(listing);
        } else {
          this.logger.warn(
            `Could not find subcategory with slug: ${service.slug}`,
          );
        }
      }
    }
  }
}
