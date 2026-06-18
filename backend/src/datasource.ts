import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from './entities/user.entity';
import { Category } from './entities/category.entity';
import { Subcategory } from './entities/subcategory.entity';
import { Listing } from './entities/listing.entity';
import { Booking } from './entities/booking.entity';
import { TokenList } from './entities/token-list.entity';

const isDev = process.env.NODE_ENV === 'development';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: 'db.katlctzngddikpmrmxyv.supabase.co',
  port: 5432,
  username: 'postgres',
  password: 'sohanpal@1235',
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false,
  },
  logging: true,
  synchronize: isDev,
  entities: [User, Category, Subcategory, Listing, Booking, TokenList],
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
