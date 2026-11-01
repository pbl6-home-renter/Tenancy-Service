import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class TemplateDataInvalidException extends DomainException {
  constructor(message: string) {
    super(message, 422, 'TEMPLATE_DATA_INVALID');
  }
}
