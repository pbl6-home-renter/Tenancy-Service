import { BillingSettingRepository } from 'modules/billing-setting/domain/repositories/billing-setting.repository';
import { BuildingRepository } from 'modules/building/domain/repositories/building.repository';
import { ContractDraftDocumentGenerateQuery } from 'modules/contract/application/queries/contract-draft-document-generate/contract-draft-document-generate.query';
import { ContractDraftDocumentGenerateQueryHandler } from 'modules/contract/application/queries/contract-draft-document-generate/contract-draft-document-generate.query.handler';
import { ContractDocumentRendererPort } from 'modules/contract/application/ports/contract-document-renderer.port';
import { ContractEntity } from 'modules/contract/domain/entities/contract.entity';
import { ContractTemplateEntity } from 'modules/contract/domain/entities/contract-template.entity';
import { PdfContractDocumentRenderer } from 'modules/contract/infrastructure/document/pdf-contract-document.renderer';
import { ContractRepository } from 'modules/contract/domain/repositories/contract.repository';
import { ContractTemplateRepository } from 'modules/contract/domain/repositories/contract-template.repository';
import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('ContractDraftDocumentGenerateQueryHandler', () => {
  const landlordId = generateUuid();
  const roomId = generateUuid();
  const buildingId = generateUuid();
  let contract: ContractEntity;
  let handler: ContractDraftDocumentGenerateQueryHandler;
  let renderer: { render: jest.Mock };
  let templates: { findByKey: jest.Mock };

  beforeEach(() => {
    contract = ContractEntity.create({
      landlordId,
      roomId,
      tenantId: null,
      tenantName: 'Tenant',
      tenantPhone: '0912345678',
      depositAmount: 2,
      rentPrice: 3,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      vehicleCount: null,
    });
    templates = {
      findByKey: jest.fn().mockResolvedValue({ templateKey: 'standard' }),
    };
    renderer = { render: jest.fn().mockResolvedValue(Buffer.from('%PDF')) };
    handler = new ContractDraftDocumentGenerateQueryHandler(
      {
        findById: jest.fn(async () => contract),
      } as unknown as ContractRepository,
      templates as unknown as ContractTemplateRepository,
      renderer as ContractDocumentRendererPort,
      {
        findById: jest.fn(async () => ({
          id: roomId,
          buildingId,
          name: '101',
        })),
      } as unknown as RoomRepository,
      {
        findById: jest.fn(async () => ({
          id: buildingId,
          name: 'Building',
          address: 'Address',
        })),
      } as unknown as BuildingRepository,
      {
        findByRoom: jest.fn(async () => null),
        findByBuilding: jest.fn(async () => ({ paymentDueDay: 5 })),
      } as unknown as BillingSettingRepository,
    );
  });

  it('renders the selected template using contract, room, building and billing data', async () => {
    contract.applyTemplate('standard');
    const result = await handler.execute(
      new ContractDraftDocumentGenerateQuery(contract.id, landlordId),
    );
    expect(result.data.toString()).toBe('%PDF');
    expect(result.filename).toBe(
      `contract-HD-${contract.id.slice(0, 6)}-draft.pdf`,
    );
    expect(templates.findByKey).toHaveBeenCalledWith('standard');
    expect(renderer.render).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantName: 'Tenant',
        tenantPhone: '0912345678',
        roomName: '101',
        buildingName: 'Building',
        buildingAddress: 'Address',
        paymentDueDay: 5,
        rentPrice: 3,
        depositAmount: 2,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      }),
    );
  });

  it('rejects another owner', async () => {
    await expect(
      handler.execute(
        new ContractDraftDocumentGenerateQuery(contract.id, generateUuid()),
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(renderer.render).not.toHaveBeenCalled();
  });

  it('rejects a contract without an applied template', async () => {
    await expect(
      handler.execute(
        new ContractDraftDocumentGenerateQuery(contract.id, landlordId),
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONTRACT_TEMPLATE_NOT_APPLIED',
    });
  });

  it('rejects contracts that are no longer drafts', async () => {
    contract.activate([generateUuid()], new Date(), generateUuid(), []);
    await expect(
      handler.execute(
        new ContractDraftDocumentGenerateQuery(contract.id, landlordId),
      ),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONTRACT_NOT_DRAFT' });
  });
});

describe('PdfContractDocumentRenderer', () => {
  it('creates a real PDF from available template variables', async () => {
    const template = ContractTemplateEntity.reconstitute({
      id: generateUuid(),
      templateKey: 'standard',
      title: 'Contract',
      version: '1',
      body: '<p>{{tenantName}} rents {{roomName}}</p>',
      requiredVariables: ['tenantName', 'roomName'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    });
    const pdf = await new PdfContractDocumentRenderer().render(template, {
      tenantName: 'Tenant',
      roomName: '101',
    });
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(100);
  });
});
