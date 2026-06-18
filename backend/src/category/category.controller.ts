import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateCategoryDto, CreateSubcategoryDto } from '../dtos/category.dto';
import { Category } from '../entities/category.entity';
import { Subcategory } from '../entities/subcategory.entity';
import { SearchSuggestionResponse } from '../types';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  async getCategories(): Promise<Category[]> {
    return this.categoryService.findAll();
  }

  @Get('suggestions')
  async getSuggestions(
    @Query('query') query: string,
  ): Promise<SearchSuggestionResponse[]> {
    return this.categoryService.searchSuggestions(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  async addCategory(@Body() createDto: CreateCategoryDto): Promise<Category> {
    return this.categoryService.createCategory(createDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':categoryId/subcategories')
  async addSubcategory(
    @Param('categoryId') categoryId: string,
    @Body() createDto: CreateSubcategoryDto,
  ): Promise<Subcategory> {
    return this.categoryService.createSubcategory(categoryId, createDto);
  }
}
