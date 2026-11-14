import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BILLING_SETTING_DI_TOKEN } from 'modules/billing-setting/billing-setting.di-token';
import { BillingSettingRepository } from 'modules/billing-setting/domain/repositories/billing-setting.repository';
import { BUILDING_DI_TOKEN } from 'modules/building/building.di-token';
import { BuildingRepository } from 'modules/building/domain/repositories/building.repository';
import { ROOM_DI_TOKEN } from 'modules/room/room.di-token';
import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { DomainException } from 'shared/domain/exceptions/domain.exception';
import { CONTRACT_DI_TOKEN } from '../../../contract.di-token';
import { ContractDocumentRendererPort } from '../../ports/contract-document-renderer.port';
import { ContractStatus } from '../../../domain/enums/contract-status.enum';
import { ContractForbiddenException } from '../../../domain/exceptions/contract-forbidden.exception';
import { ContractNotDraftException } from '../../../domain/exceptions/contract-not-draft.exception';
import { TemplateDataInvalidException } from '../../../domain/exceptions/template-data-invalid.exception';
import { ContractRepository } from '../../../domain/repositories/contract.repository';
import { ContractTemplateRepository } from '../../../domain/repositories/contract-template.repository';
import { ContractDraftDocumentGenerateQuery } from './contract-draft-document-generate.query';

class DraftDocumentError extends DomainException {}

export interface DraftDocument {
  data: Buffer;
  filename: string;
}

@QueryHandler(ContractDraftDocumentGenerateQuery)
export class ContractDraftDocumentGenerateQueryHandler implements IQueryHandler<
  ContractDraftDocumentGenerateQuery,
  DraftDocument
> {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.REPOSITORY)
    private readonly contracts: ContractRepository,
    @Inject(CONTRACT_DI_TOKEN.TEMPLATE_REPOSITORY)
    private readonly templates: ContractTemplateRepository,
    @Inject(CONTRACT_DI_TOKEN.DOCUMENT_RENDERER)
    private readonly renderer: ContractDocumentRendererPort,
    @Inject(ROOM_DI_TOKEN.REPOSITORY) private readonly rooms: RoomRepository,
    @Inject(BUILDING_DI_TOKEN.REPOSITORY)
    private readonly buildings: BuildingRepository,
    @Inject(BILLING_SETTING_DI_TOKEN.REPOSITORY)
    private readonly settings: BillingSettingRepository,
  ) {}

  async execute(
    query: ContractDraftDocumentGenerateQuery,
  ): Promise<DraftDocument> {
    const contract = await this.contracts.findById(query.contractId);
    if (!contract)
      throw new DraftDocumentError(
        'Contract not found',
        404,
        'CONTRACT_NOT_FOUND',
      );
    if (contract.landlordId !== query.landlordId)
      throw new ContractForbiddenException();
    if (contract.status !== ContractStatus.DRAFT)
      throw new ContractNotDraftException(contract.id);
    if (!contract.templateKey)
      throw new DraftDocumentError(
        'No template has been applied',
        409,
        'CONTRACT_TEMPLATE_NOT_APPLIED',
      );

    const template = await this.templates.findByKey(contract.templateKey);
    if (!template)
      throw new DraftDocumentError(
        'Contract template not found',
        404,
        'TEMPLATE_NOT_FOUND',
      );
    const room = await this.rooms.findById(contract.roomId);
    if (!room)
      throw new TemplateDataInvalidException('Room data is unavailable');
    const building = await this.buildings.findById(room.buildingId);
    if (!building)
      throw new TemplateDataInvalidException('Building data is unavailable');
    const roomSetting = await this.settings.findByRoom(room.id);
    const setting =
      roomSetting ?? (await this.settings.findByBuilding(building.id));
    const data = await this.renderer.render(template, {
      contractCode: `HD-${contract.id.slice(0, 6)}`,
      landlordName: '',
      tenantName: contract.tenantName,
      tenantPhone: contract.tenantPhone,
      roomName: room.name,
      buildingName: building.name,
      buildingAddress: building.address,
      startDate: contract.startDate,
      endDate: contract.endDate,
      rentPrice: contract.rentPrice,
      depositAmount: contract.depositAmount,
      paymentDueDay: setting?.paymentDueDay,
    });
    return {
      data,
      filename: `contract-HD-${contract.id.slice(0, 6)}-draft.pdf`,
    };
  }
}
