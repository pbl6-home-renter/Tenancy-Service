import { ContractTemplateEntity } from '../../../domain/entities/contract-template.entity';
import { ContractTemplateTypeormEntity } from '../contract-template.entity';

export class ContractTemplateMapper {
  static toDomain(raw: ContractTemplateTypeormEntity): ContractTemplateEntity {
    return ContractTemplateEntity.reconstitute({
      id: raw.id,
      templateKey: raw.templateKey,
      title: raw.title,
      version: raw.version,
      body: raw.body,
      requiredVariables: raw.requiredVariables,
      isActive: raw.isActive,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      isDeleted: raw.isDeleted,
    });
  }
}
