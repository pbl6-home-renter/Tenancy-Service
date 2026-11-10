import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ContractTypeormEntity } from 'modules/contract/infrastructure/persistence/contract.entity';
import { applyContractTenantAccess } from 'modules/contract/infrastructure/persistence/contract-tenant-access.query';
import { RoomTypeormEntity } from 'modules/room/infrastructure/persistence/room.typeorm-entity';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { applySortingToQueryBuilder } from 'shared/infrastructure/database/pagination/sort.helper';
import {
  InvoiceDetailView,
  InvoiceListFilter,
  InvoiceListView,
  InvoiceMyListFilter,
  InvoiceMyListView,
  InvoiceReadPort,
} from '../../application/ports/invoice-read.port';
import { InvoiceStatus } from '../../domain/enums/invoice-status.enum';
import { InvoiceMapper } from './mappers/invoice.mapper';
import { InvoiceTypeormEntity } from './invoice.typeorm-entity';

type InvoiceListRow = Omit<InvoiceListView, 'invoiceStatus'> & {
  invoiceStatus: InvoiceStatus;
};

@Injectable()
export class TypeOrmInvoiceReadAdapter implements InvoiceReadPort {
  constructor(
    @InjectRepository(InvoiceTypeormEntity)
    private readonly repository: Repository<InvoiceTypeormEntity>,
  ) {}

  async findPage(
    landlordId: Uuid,
    options: OffsetPageQuery<InvoiceListFilter>,
  ): Promise<PaginatedResult<InvoiceListView>> {
    const query = this.repository
      .createQueryBuilder('invoice')
      .innerJoin(
        ContractTypeormEntity,
        'contract',
        'contract.id = invoice.contractId',
      )
      .innerJoin(RoomTypeormEntity, 'room', 'room.id = contract.roomId')
      .where('contract.landlordId = :landlordId', { landlordId })
      .andWhere('invoice.isDeleted = false');
    const filter = options.filter;
    if (filter?.buildingId)
      query.andWhere('room.buildingId = :buildingId', {
        buildingId: filter.buildingId,
      });
    if (filter?.roomId)
      query.andWhere('room.id = :roomId', { roomId: filter.roomId });
    if (filter?.contractId)
      query.andWhere('contract.id = :contractId', {
        contractId: filter.contractId,
      });
    if (filter?.period)
      query.andWhere('invoice.period = :period', { period: filter.period });
    if (filter?.status)
      query.andWhere('invoice.status = :status', { status: filter.status });

    const totalItems = await query.getCount();
    applySortingToQueryBuilder(query, options, {
      whitelist: ['period', 'createdAt'],
      defaultSort: 'period',
      defaultOrder: 'desc',
      alias: 'invoice',
    });
    const rows = await query
      .select('invoice.id', 'id')
      .addSelect('invoice.code', 'code')
      .addSelect('invoice.contractId', 'contractId')
      .addSelect('contract.roomId', 'roomId')
      .addSelect('room.name', 'roomName')
      .addSelect('contract.tenantName', 'tenantName')
      .addSelect('contract.tenantPhone', 'tenantPhone')
      .addSelect('invoice.period', 'period')
      .addSelect('invoice.totalAmount', 'totalAmount')
      .addSelect('invoice.status', 'invoiceStatus')
      .addSelect('invoice.issuedAt', 'issuedAt')
      .offset((options.pageNo - 1) * options.pageSize)
      .limit(options.pageSize)
      .getRawMany<InvoiceListRow>();
    const totalPages = Math.ceil(totalItems / options.pageSize);
    return {
      data: rows,
      pagination: {
        type: 'offset',
        pageNo: options.pageNo,
        pageSize: options.pageSize,
        totalItems,
        totalPages,
        hasNextPage: options.pageNo < totalPages,
        hasPreviousPage: options.pageNo > 1,
      },
    };
  }

  async findById(id: Uuid): Promise<InvoiceDetailView | null> {
    return this.readDetail(
      this.detailQuery().andWhere('invoice.id = :id', { id }),
    );
  }

  async findPageByTenant(
    tenantId: Uuid,
    options: OffsetPageQuery<InvoiceMyListFilter>,
  ): Promise<PaginatedResult<InvoiceMyListView>> {
    const query = this.repository
      .createQueryBuilder('invoice')
      .innerJoin(
        ContractTypeormEntity,
        'contract',
        'contract.id = invoice.contractId',
      )
      .innerJoin(RoomTypeormEntity, 'room', 'room.id = contract.roomId')
      .where('invoice.isDeleted = false')
      .andWhere('contract.isDeleted = false')
      .andWhere('invoice.status = :issuedStatus', {
        issuedStatus: InvoiceStatus.ISSUED,
      });
    applyContractTenantAccess(query, tenantId);
    if (options.filter?.contractId)
      query.andWhere('invoice.contractId = :contractId', {
        contractId: options.filter.contractId,
      });
    if (options.filter?.period)
      query.andWhere('invoice.period = :period', {
        period: options.filter.period,
      });
    const totalItems = await query.getCount();
    applySortingToQueryBuilder(query, options, {
      whitelist: ['period'],
      defaultSort: 'period',
      defaultOrder: 'desc',
      alias: 'invoice',
    });
    const rows = await query
      .select('invoice.id', 'id')
      .addSelect('invoice.code', 'code')
      .addSelect('invoice.contractId', 'contractId')
      .addSelect('room.name', 'roomName')
      .addSelect('invoice.period', 'period')
      .addSelect('invoice.totalAmount', 'totalAmount')
      .addSelect('invoice.status', 'invoiceStatus')
      .addSelect('invoice.issuedAt', 'issuedAt')
      .offset((options.pageNo - 1) * options.pageSize)
      .limit(options.pageSize)
      .getRawMany<InvoiceMyListView>();
    const totalPages = Math.ceil(totalItems / options.pageSize);
    return {
      data: rows,
      pagination: {
        type: 'offset',
        pageNo: options.pageNo,
        pageSize: options.pageSize,
        totalItems,
        totalPages,
        hasNextPage: options.pageNo < totalPages,
        hasPreviousPage: options.pageNo > 1,
      },
    };
  }

  findIssuedByIdForTenant(
    id: Uuid,
    tenantId: Uuid,
  ): Promise<InvoiceDetailView | null> {
    const query = this.detailQuery()
      .andWhere('invoice.id = :id', { id })
      .andWhere('invoice.status = :issuedStatus', {
        issuedStatus: InvoiceStatus.ISSUED,
      })
      .andWhere('contract.isDeleted = false');
    applyContractTenantAccess(query, tenantId);
    return this.readDetail(query);
  }

  private detailQuery(): SelectQueryBuilder<InvoiceTypeormEntity> {
    return this.repository
      .createQueryBuilder('invoice')
      .innerJoin(
        ContractTypeormEntity,
        'contract',
        'contract.id = invoice.contractId',
      )
      .innerJoin(RoomTypeormEntity, 'room', 'room.id = contract.roomId')
      .addSelect('contract.landlordId', 'landlordId')
      .addSelect('contract.roomId', 'roomId')
      .addSelect('room.name', 'roomName')
      .addSelect('contract.tenantName', 'tenantName')
      .addSelect('contract.tenantPhone', 'tenantPhone')
      .where('invoice.isDeleted = false');
  }

  private async readDetail(
    query: SelectQueryBuilder<InvoiceTypeormEntity>,
  ): Promise<InvoiceDetailView | null> {
    const { raw, entities } = await query.getRawAndEntities();
    if (!entities.length) return null;
    const metadata = raw[0] as {
      landlordId: Uuid;
      roomId: Uuid;
      roomName: string;
      tenantName: string | null;
      tenantPhone: string | null;
    };
    return {
      invoice: InvoiceMapper.toDomain(entities[0]),
      ...metadata,
    };
  }
}
