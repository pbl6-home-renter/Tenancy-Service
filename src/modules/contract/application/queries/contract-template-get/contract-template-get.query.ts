import { IQuery } from '@nestjs/cqrs';

export class ContractTemplateGetQuery implements IQuery {
  constructor(public readonly templateKey: string) {}
}
