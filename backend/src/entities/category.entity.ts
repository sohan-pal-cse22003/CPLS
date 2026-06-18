import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Subcategory } from './subcategory.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  icon: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(() => Subcategory, (sub) => sub.category)
  subcategories: Subcategory[];
}
