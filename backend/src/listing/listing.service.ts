import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Listing } from '../entities/listing.entity';
import { User } from '../entities/user.entity';
import { Subcategory } from '../entities/subcategory.entity';
import { ProviderServiceDto } from '../dtos/auth.dto';
import { ProviderListingResponse } from '../types';

@Injectable()
export class ListingService {
  constructor(
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Subcategory)
    private subcategoryRepository: Repository<Subcategory>,
  ) {}

  async getProvidersForService(
    subcatId: string,
  ): Promise<ProviderListingResponse[]> {
    const listings = await this.listingRepository.find({
      where: { subcat_id: subcatId },
      relations: { provider: true, subcategory: true, category: true },
    });

    // Filter to only approved, unblocked, online providers
    const activeListings = listings.filter(
      (l) =>
        l.provider &&
        l.provider.isApproved &&
        !l.provider.isBlocked &&
        l.provider.online,
    );

    return activeListings.map((l) => ({
      id: l.provider.id,
      name: l.provider.name,
      rating: Number(l.provider.rating),
      price: Number(l.price),
      categoryId: l.cat_id,
      serviceName: l.subcategory.name,
    }));
  }

  async updateProviderServices(
    providerId: string,
    services: ProviderServiceDto[],
  ): Promise<User> {
    const provider = await this.userRepository.findOne({
      where: { id: providerId, role: 'provider' },
      relations: { listings: true },
    });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Delete existing listings for this provider
    await this.listingRepository.delete({ provider_id: providerId });

    // Insert new listings
    for (const service of services) {
      const subcat = await this.subcategoryRepository.findOne({
        where: { id: service.id },
      });
      if (subcat) {
        const listing = new Listing();
        listing.provider_id = providerId;
        listing.cat_id = subcat.cat_id;
        listing.subcat_id = subcat.id;
        listing.price = service.price ? Number(service.price) : subcat.price;
        listing.time_required = subcat.time;
        await this.listingRepository.save(listing);
      }
    }

    // Return the updated provider profile with its new listings
    const updatedProvider = await this.userRepository.findOne({
      where: { id: providerId },
      relations: { listings: true },
    });

    if (!updatedProvider) {
      throw new NotFoundException('Provider not found after catalog update');
    }

    return updatedProvider;
  }

  async toggleProviderStatus(providerId: string): Promise<User> {
    const provider = await this.userRepository.findOne({
      where: { id: providerId, role: 'provider' },
      relations: { listings: true },
    });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    provider.online = !provider.online;
    const saved = await this.userRepository.save(provider);
    return saved;
  }
}
