import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Category } from './category.entity';
import { Subcategory } from './subcategory.entity';
import { User } from './user.entity';

@Unique(['subcat_id', 'provider_id'])
@Entity('listings')
export class Listing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  cat_id: string;

  @Column('uuid')
  subcat_id: string;

  @Column('uuid')
  provider_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'varchar', nullable: true })
  time_required: string;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cat_id' })
  category: Category;

  @ManyToOne(() => Subcategory, (sub) => sub.listings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subcat_id' })
  subcategory: Subcategory;

  @ManyToOne(() => User, (user) => user.listings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: User;
}
