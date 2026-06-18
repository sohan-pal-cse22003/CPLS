import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Listing } from './listing.entity';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  consumerId: string;

  @Column('uuid')
  listing_id: string;

  @Column({ type: 'date' })
  date: string; // Stored as ISO date string 'YYYY-MM-DD'

  @Column({ type: 'varchar' })
  time: string; // e.g. '11:00 AM'

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';

  @Column({ type: 'integer', default: 0 })
  rating: number;

  @Column({ type: 'text', default: '' })
  comment: string;

  @Column({ nullable: true })
  otp?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @ManyToOne(() => User, (user) => user.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'consumerId' })
  consumer: User;

  @ManyToOne(() => Listing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: Listing;
}
