import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Listing } from './listing.entity';
import { Booking } from './booking.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password?: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', default: 'consumer' })
  role: 'admin' | 'provider' | 'consumer';

  @Column({ type: 'boolean', default: false })
  isBlocked: boolean;

  @Column({ type: 'boolean', default: false })
  online: boolean;

  @Column({ type: 'boolean', default: true })
  isApproved: boolean;

  @Column({ nullable: true })
  otp?: string;

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  rating: number;

  @OneToMany(() => Listing, (listing) => listing.provider)
  listings: Listing[];

  @OneToMany(() => Booking, (booking) => booking.consumer)
  bookings: Booking[];
}
