import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { InvoiceEntity } from '../../domain/entities/invoice.entity';
import { InvoiceStatus } from '../../domain/enums/invoice-status.enum';

export interface InvoiceListFilter {
  buildingId?: Uuid;
  roomId?: Uuid;
  contractId?: Uuid;
  period?: string;
  status?: InvoiceStatus;
}

export interface InvoiceMyListFilter {
  contractId?: Uuid;
  period?: string;
}

export interface InvoiceMyListView {
  id: Uuid;
  code: string;
  contractId: Uuid;
  roomName: string;
  period: string;
  totalAmount: string;
  invoiceStatus: InvoiceStatus.ISSUED;
  issuedAt: Date;
}

export interface InvoiceListView {
  id: Uuid;
  code: string;
  contractId: Uuid;
  roomId: Uuid;
  roomName: string;
  tenantName: string | null;
  tenantPhone: string | null;
  period: string;
  totalAmount: string;
  invoiceStatus: InvoiceStatus;
  issuedAt: Date | null;
}

export interface InvoiceDetailView {
  invoice: InvoiceEntity;
  landlordId: Uuid;
  roomId: Uuid;
  roomName: string;
  tenantName: string | null;
  tenantPhone: string | null;
}

export interface InvoiceReadPort {
  findPage(
    landlordId: Uuid,
    query: OffsetPageQuery<InvoiceListFilter>,
  ): Promise<PaginatedResult<InvoiceListView>>;
  findById(id: Uuid): Promise<InvoiceDetailView | null>;
  findPageByTenant(
    tenantId: Uuid,
    query: OffsetPageQuery<InvoiceMyListFilter>,
  ): Promise<PaginatedResult<InvoiceMyListView>>;
  findIssuedByIdForTenant(
    id: Uuid,
    tenantId: Uuid,
  ): Promise<InvoiceDetailView | null>;
}
