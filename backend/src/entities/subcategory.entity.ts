import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Category } from './category.entity';
import { Listing } from './listing.entity';

@Entity('subcategories')
export class Subcategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column('uuid')
  cat_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number; // Base price for the service subcategory

  @Column({ type: 'varchar', default: '1 hour' })
  time: string; // Base time for the service subcategory

  @ManyToOne(() => Category, (cat) => cat.subcategories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cat_id' })
  category: Category;

  @OneToMany(() => Listing, (listing) => listing.subcategory)
  listings: Listing[];
}
