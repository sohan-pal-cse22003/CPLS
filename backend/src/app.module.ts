import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './entities/user.entity';
import { Category } from './entities/category.entity';
import { Subcategory } from './entities/subcategory.entity';
import { Listing } from './entities/listing.entity';
import { Booking } from './entities/booking.entity';
import { TokenList } from './entities/token-list.entity';
import { AuthModule } from './auth/auth.module';
import { CategoryModule } from './category/category.module';
import { ListingModule } from './listing/listing.module';
import { BookingModule } from './booking/booking.module';
import { AdminModule } from './admin/admin.module';
import { dataSourceOptions } from './datasource';
import { UserSerializerInterceptor } from './interceptors/user-serializer.interceptor';

@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions),
    TypeOrmModule.forFeature([
      User,
      Category,
      Subcategory,
      Listing,
      Booking,
      TokenList,
    ]),
    AuthModule,
    CategoryModule,
    ListingModule,
    BookingModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: UserSerializerInterceptor,
    },
  ],
})
export class AppModule {}
