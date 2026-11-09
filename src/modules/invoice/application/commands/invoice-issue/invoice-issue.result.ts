import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { InvoiceStatus } from '../../../domain/enums/invoice-status.enum';

export interface InvoiceIssueSucceeded {
  id: Uuid;
  code: string;
  invoiceStatus: InvoiceStatus.ISSUED;
  issuedAt: string;
}

export interface InvoiceIssueFailed {
  invoiceId: Uuid;
  code: string;
}

export interface InvoiceIssueResult {
  requested: number;
  succeeded: InvoiceIssueSucceeded[];
  failed: InvoiceIssueFailed[];
}
