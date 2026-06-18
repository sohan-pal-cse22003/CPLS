import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { Subcategory } from '../entities/subcategory.entity';
import { CreateCategoryDto, CreateSubcategoryDto } from '../dtos/category.dto';
import { SearchSuggestionResponse } from '../types';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Subcategory)
    private subcategoryRepository: Repository<Subcategory>,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find({
      relations: { subcategories: true },
    });
  }

  async createCategory(createDto: CreateCategoryDto): Promise<Category> {
    const { id, name, icon, description } = createDto;

    // Check if category already exists with the same ID or name
    let exists = await this.categoryRepository.findOne({ where: { name } });
    if (exists) {
      throw new ConflictException('Category with this name already exists');
    }

    if (id) {
      exists = await this.categoryRepository.findOne({ where: { id } });
      if (exists) {
        throw new ConflictException('Category with this ID already exists');
      }
    }

    const cat = new Category();
    if (id) {
      cat.id = id;
    }
    cat.name = name;
    cat.icon = icon;
    cat.description = description || '';

    return this.categoryRepository.save(cat);
  }

  async createSubcategory(
    catId: string,
    createDto: CreateSubcategoryDto,
  ): Promise<Subcategory> {
    const { name, price, time, description } = createDto;

    const cat = await this.categoryRepository.findOne({ where: { id: catId } });
    if (!cat) {
      throw new NotFoundException('Category not found');
    }

    const sub = new Subcategory();
    sub.name = name;
    sub.price = Number(price);
    sub.time = time || '1 hour';
    sub.description = description || '';
    sub.cat_id = catId;

    return this.subcategoryRepository.save(sub);
  }

  async searchSuggestions(query: string): Promise<SearchSuggestionResponse[]> {
    if (!query || query.trim() === '') {
      return [];
    }

    const q = query.toLowerCase().trim();
    const categories = await this.categoryRepository.find({
      relations: { subcategories: true },
    });

    const suggestions: SearchSuggestionResponse[] = [];

    categories.forEach((cat) => {
      // Check Categories
      if (cat.name.toLowerCase().includes(q)) {
        suggestions.push({
          type: 'category',
          id: cat.id,
          title: cat.name,
          categoryName: cat.name,
          badge: 'Category',
        });
      }

      // Check Subcategories
      cat.subcategories.forEach((sub) => {
        if (
          sub.name.toLowerCase().includes(q) ||
          (sub.description && sub.description.toLowerCase().includes(q))
        ) {
          suggestions.push({
            type: 'subcategory',
            id: sub.id,
            title: sub.name,
            categoryId: cat.id,
            categoryName: cat.name,
            price: Number(sub.price),
            badge: cat.name,
          });
        }
      });
    });

    return suggestions.slice(0, 8);
  }
}
