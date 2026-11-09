import { InvoiceBlockReason } from '../../../domain/enums/invoice-block-reason.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface InvoiceGenerateItem {
  invoiceId: Uuid;
  code: string;
  contractId: Uuid;
  roomId: Uuid;
  totalAmount: string;
}

export interface InvoiceBlockedItem {
  roomId: Uuid;
  contractId: Uuid;
  reasonCode: InvoiceBlockReason;
}

export interface InvoiceGenerateResult {
  buildingId: Uuid;
  period: string;
  generated: InvoiceGenerateItem[];
  recalculated: InvoiceGenerateItem[];
  blocked: InvoiceBlockedItem[];
}

export enum InvoiceGenerateOutcomeKind {
  GENERATED = 'generated',
  RECALCULATED = 'recalculated',
  BLOCKED = 'blocked',
}

export type InvoiceGenerateOutcome =
  | {
      kind:
        | InvoiceGenerateOutcomeKind.GENERATED
        | InvoiceGenerateOutcomeKind.RECALCULATED;
      item: InvoiceGenerateItem;
    }
  | {
      kind: InvoiceGenerateOutcomeKind.BLOCKED;
      item: InvoiceBlockedItem;
    };
