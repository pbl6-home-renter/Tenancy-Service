import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ContractTemplateNotFoundException extends DomainException {
  constructor(templateKey: string) {
    super(
      `Contract template "${templateKey}" not found`,
      404,
      'RESOURCE_NOT_FOUND',
    );
  }
}
