import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingService } from './listing.service';
import { ListingController } from './listing.controller';
import { Listing } from '../entities/listing.entity';
import { User } from '../entities/user.entity';
import { Subcategory } from '../entities/subcategory.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Listing, User, Subcategory]), AuthModule],
  controllers: [ListingController],
  providers: [ListingService],
  exports: [ListingService],
})
export class ListingModule {}
