import { ApiProperty } from '@nestjs/swagger';
import { ContractTemplateEntity } from '../../../domain/entities/contract-template.entity';

export class ContractTemplateDetailResponseDto {
  @ApiProperty()
  templateKey: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  version: string;

  @ApiProperty({ type: [String] })
  requiredVariables: string[];

  static fromDomain(
    template: ContractTemplateEntity,
  ): ContractTemplateDetailResponseDto {
    const response = new ContractTemplateDetailResponseDto();
    response.templateKey = template.templateKey;
    response.title = template.title;
    response.version = template.version;
    response.requiredVariables = [...template.requiredVariables];
    return response;
  }
}
