import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ProviderServiceDto } from './auth.dto';

export class UpdateCatalogDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProviderServiceDto)
  services: ProviderServiceDto[];
}
