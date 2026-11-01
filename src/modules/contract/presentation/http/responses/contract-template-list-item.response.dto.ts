import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { ContractTemplateEntity } from '../../../domain/entities/contract-template.entity';

@ApiSchema({ name: 'ContractTemplateListResponseDto' })
export class ContractTemplateListItemResponseDto {
  @ApiProperty()
  templateKey: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  version: string;

  static fromDomain(
    template: ContractTemplateEntity,
  ): ContractTemplateListItemResponseDto {
    const response = new ContractTemplateListItemResponseDto();
    response.templateKey = template.templateKey;
    response.title = template.title;
    response.version = template.version;
    return response;
  }
}
