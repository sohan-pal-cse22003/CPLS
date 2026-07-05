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
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'postgres',
  ssl: {
    rejectUnauthorized: false,
  },
  logging: true,
  synchronize: isDev,
  entities: [User, Category, Subcategory, Listing, Booking, TokenList],
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
