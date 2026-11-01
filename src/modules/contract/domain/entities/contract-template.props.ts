import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface ContractTemplateProps {
  id: Uuid;
  templateKey: string;
  title: string;
  version: string;
  body: string;
  requiredVariables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}
