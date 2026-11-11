import { InvoiceListQuery } from 'modules/invoice/application/queries/invoice-list/invoice-list.query';
import { InvoiceListQueryHandler } from 'modules/invoice/application/queries/invoice-list/invoice-list.query.handler';
import { InvoiceReadPort } from 'modules/invoice/application/ports/invoice-read.port';
import { InvoiceStatus } from 'modules/invoice/domain/enums/invoice-status.enum';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('InvoiceListQueryHandler', () => {
  it('preserves the landlord boundary and filtered offset-page options', async () => {
    const landlordId = generateUuid();
    const options = {
      pageNo: 3,
      pageSize: 20,
      sort: 'issuedAt',
      order: 'desc' as const,
      filter: { buildingId: generateUuid(), status: InvoiceStatus.ISSUED },
    };
    const result = {
      data: [],
      pagination: {
        type: 'offset' as const,
        pageNo: 3,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
    const invoices = {
      findPage: jest.fn(async () => result),
    } as unknown as InvoiceReadPort;
    const handler = new InvoiceListQueryHandler(invoices);

    await expect(
      handler.execute(new InvoiceListQuery(landlordId, options)),
    ).resolves.toBe(result);

    expect(invoices.findPage).toHaveBeenCalledWith(landlordId, options);
  });
});
