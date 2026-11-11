import { ContractTemplateEntity } from 'modules/contract/domain/entities/contract-template.entity';
import { TemplateDataInvalidException } from 'modules/contract/domain/exceptions/template-data-invalid.exception';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('ContractTemplateEntity', () => {
  it('accepts non-empty required values and finite numbers', () => {
    const template = ContractTemplateEntity.reconstitute({
      id: generateUuid(),
      templateKey: 'standard-lease',
      title: 'Standard lease',
      version: '1',
      body: 'Lease for {{tenantName}} at {{rent}}',
      requiredVariables: ['tenantName', 'rent'],
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      isDeleted: false,
    });

    expect(() =>
      template.assertVariables({ tenantName: 'Tenant One', rent: 3000000 }),
    ).not.toThrow();
  });

  it('rejects blank strings, non-finite numbers, and missing variables', () => {
    const template = ContractTemplateEntity.reconstitute({
      id: generateUuid(),
      templateKey: 'standard-lease',
      title: 'Standard lease',
      version: '1',
      body: 'Lease',
      requiredVariables: ['tenantName', 'rent'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    });

    expect(() =>
      template.assertVariables({ tenantName: ' ', rent: Infinity }),
    ).toThrow(TemplateDataInvalidException);
    expect(() =>
      template.assertVariables({ tenantName: 'Tenant One' }),
    ).toThrow(TemplateDataInvalidException);
  });
});
