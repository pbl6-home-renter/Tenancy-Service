jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));
import { TypeOrmContractTenantReadQuery } from 'modules/contract/infrastructure/persistence/contract-tenant-read.query';
import { ContractTenantGetByIdQueryHandler } from 'modules/contract/application/queries/contract-tenant-get-by-id/contract-tenant-get-by-id.query.handler';
import { ContractTenantGetByIdQuery } from 'modules/contract/application/queries/contract-tenant-get-by-id/contract-tenant-get-by-id.query';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  createContractTenantFixture,
  landlordA,
  landlordB,
  linkedTenant,
  today,
} from '../support/contract-tenant-read.fixture';

// Run SQL cases against a test PostgreSQL with CONTRACT_TENANT_TEST_DATABASE_URL.
// They use temporary tables and roll back the fixture transaction on completion.
const describePostgres = process.env.CONTRACT_TENANT_TEST_DATABASE_URL
  ? describe
  : describe.skip;

describePostgres('landlord tenant SQL against PostgreSQL', () => {
  let fixture: Awaited<ReturnType<typeof createContractTenantFixture>>;
  let read: TypeOrmContractTenantReadQuery;
  const owner = landlordA as Uuid;
  const list = (
    scope: 'current' | 'history' = 'current',
    pageNo = 1,
    pageSize = 20,
  ) => read.findPage(owner, { pageNo, pageSize, filter: { scope } });

  beforeAll(async () => {
    fixture = await createContractTenantFixture();
    read = new TypeOrmContractTenantReadQuery(fixture.repository);
  });
  beforeEach(async () => {
    await fixture.db.exec('TRUNCATE contract_members, contracts CASCADE');
  });
  afterAll(async () => {
    await fixture?.db.close();
  });

  it('applies ownership before grouping and checks the requested member before expanding tenantId', async () => {
    const a = await fixture.member(await fixture.contract());
    const b = await fixture.member(
      await fixture.contract({ landlordId: landlordB }),
      { name: 'Private B' },
    );
    const result = await list();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].contractCount).toBe(1);
    const detail = await read.findByMemberId(owner, a as Uuid);
    expect(detail?.memberships.map((m) => m.contractMemberId)).toEqual([a]);
    expect(await read.findByMemberId(owner, b as Uuid)).toBeNull();
    const handler = new ContractTenantGetByIdQueryHandler(read);
    await expect(
      handler.execute(new ContractTenantGetByIdQuery(owner, b as Uuid)),
    ).rejects.toMatchObject({ statusCode: 404, code: 'RESOURCE_NOT_FOUND' });
    expect(
      (await read.findPage(landlordB as Uuid, { pageNo: 1, pageSize: 20 }))
        .data[0].tenantName,
    ).toBe('Private B');
  });

  it('groups linked memberships, keeps unlinked names/phones separate, and accepts old IDs after linking', async () => {
    const a = await fixture.member(await fixture.contract(), {
      joined: '2021-01-01',
    });
    const b = await fixture.member(await fixture.contract(), {
      joined: '2022-01-01',
    });
    const unlinked = await fixture.member(await fixture.contract(), {
      tenantId: null,
      joined: '2023-01-01',
    });
    await fixture.member(await fixture.contract(), { tenantId: null });
    expect((await list()).pagination.totalItems).toBe(3);
    expect(
      (await read.findByMemberId(owner, unlinked as Uuid))?.contractMemberId,
    ).toBe(unlinked);
    expect(
      (await read.findByMemberId(owner, b as Uuid))?.contractMemberId,
    ).toBe(a);
    await fixture.db.query(
      'UPDATE contract_members SET tenant_id = $1 WHERE id = $2',
      [linkedTenant, unlinked],
    );
    const detail = await read.findByMemberId(owner, unlinked as Uuid);
    expect(detail?.contractMemberId).toBe(a);
    expect(detail?.contractCount).toBe(3);
    expect(detail?.memberships).toHaveLength(3);
    expect((await list()).pagination.totalItems).toBe(2);
  });

  it('retains historical stays while any membership is current; counts contracts rather than stays', async () => {
    const contract = await fixture.contract();
    const old = await fixture.member(contract, {
      joined: '2020-01-01',
      left: '2021-01-01',
      name: 'Old snapshot',
    });
    await fixture.member(contract, { joined: '2022-01-01', left: today() });
    await fixture.member(await fixture.contract(), {
      joined: today(),
      left: '2999-01-01',
    });
    expect((await list()).data[0]).toMatchObject({
      contractMemberId: old,
      tenantName: 'Old snapshot',
      contractCount: 2,
    });
    expect((await list('history')).data).toEqual([]);
    const detail = await read.findByMemberId(owner, old as Uuid);
    expect(detail?.memberships).toHaveLength(3);
    expect(detail?.memberships.map((m) => m.isCurrent)).toEqual([
      false,
      false,
      true,
    ]);
    await fixture.db.query(
      'UPDATE contract_members SET left_at = $1 WHERE left_at IS NOT NULL',
      [today()],
    );
    expect((await list()).data).toEqual([]);
    expect((await list('history')).data[0].contractMemberId).toBe(old);
  });

  it.each(['suspended', 'terminated'])(
    'keeps %s occupancy until handover and then moves the group to history',
    async (status) => {
      const contract = await fixture.contract({
        status,
        lockCycle: status === 'terminated',
      });
      const member = await fixture.member(contract);
      expect((await list()).data[0].contractMemberId).toBe(member);
      await fixture.db.query(
        "UPDATE contracts SET status = 'terminated', lock_termination_cycle_id = $1, handover_completed_on = $2 WHERE id = $3",
        [linkedTenant, today(), contract],
      );
      expect((await list()).data).toEqual([]);
      expect((await list('history')).data[0].contractMemberId).toBe(member);
    },
  );

  it('does not keep ordinary terminated or expired contracts current', async () => {
    await fixture.member(await fixture.contract({ status: 'terminated' }));
    await fixture.member(await fixture.contract({ status: 'expired' }));
    expect((await list()).data).toEqual([]);
    expect((await list('history')).data[0].contractCount).toBe(2);
  });

  it('excludes deleted, never activated and future records even as detail anchors', async () => {
    const active = await fixture.contract();
    const hidden = [
      await fixture.member(active, { deleted: true }),
      await fixture.member(active, {
        joined: '2999-01-01',
        left: '2999-02-01',
      }),
      await fixture.member(await fixture.contract({ deleted: true })),
      await fixture.member(
        await fixture.contract({ status: 'draft', activated: false }),
      ),
      await fixture.member(
        await fixture.contract({ status: 'signed', activated: false }),
      ),
      await fixture.member(await fixture.contract({ activated: false })),
    ];
    await fixture.member(active);
    expect((await list()).data[0].contractCount).toBe(1);
    for (const id of [...hidden, 'd0000000-0000-4000-8000-000000000001']) {
      expect(await read.findByMemberId(owner, id as Uuid)).toBeNull();
    }
  });

  it('uses a stable valid name snapshot, keeps missing contacts null, and never puts phone in lists', async () => {
    const contract = await fixture.contract();
    const first = await fixture.member(contract, { name: null, phone: null });
    expect((await list()).data[0].tenantName).toBeNull();
    expect(
      (await read.findByMemberId(owner, first as Uuid))?.memberships[0]
        .tenantPhone,
    ).toBeNull();
    const name = await fixture.member(contract, {
      name: '  Snapshot  ',
      joined: '2021-01-01',
      left: '2022-01-01',
    });
    await fixture.member(contract, {
      name: 'Ignored deleted',
      deleted: true,
      joined: '2001-01-01',
    });
    await fixture.member(contract, {
      name: 'Future',
      joined: '2999-01-01',
      left: '2999-02-01',
    });
    const detail = await read.findByMemberId(owner, name as Uuid);
    expect(detail?.tenantName).toBe('Snapshot');
    expect(detail?.contractMemberId).toBe(first);
    expect(detail?.memberships[0].tenantPhone).toBeNull();
    expect(JSON.stringify((await list()).data)).not.toContain('tenantPhone');
    expect(JSON.stringify(detail)).not.toContain('tenantId');
  });

  it('sorts both directions with missing names last without changing group IDs', async () => {
    for (const [index, name] of [null, 'Z', 'A'].entries()) {
      await fixture.member(await fixture.contract(), {
        tenantId: `20000000-0000-4000-8000-00000000000${index}`,
        name,
      });
    }
    const asc = await list();
    const desc = await read.findPage(owner, {
      pageNo: 1,
      pageSize: 20,
      sort: 'tenantName',
      order: 'desc',
    });
    expect(asc.data.map((row) => row.tenantName)).toEqual(['A', 'Z', null]);
    expect(desc.data.map((row) => row.tenantName)).toEqual(['Z', 'A', null]);
    expect(desc.data.map((row) => row.contractMemberId).sort()).toEqual(
      asc.data.map((row) => row.contractMemberId).sort(),
    );
  });

  it('paginates groups with tied names deterministically and returns totals on an empty page', async () => {
    for (let index = 5; index > 0; index--) {
      const member = `10000000-0000-4000-8000-00000000000${index}`;
      const tenant = `20000000-0000-4000-8000-00000000000${index}`;
      await fixture.member(await fixture.contract(), {
        id: member,
        tenantId: tenant,
      });
      await fixture.member(await fixture.contract(), {
        tenantId: tenant,
        joined: '2021-01-01',
      });
    }
    const pages = [
      await list('current', 1, 2),
      await list('current', 2, 2),
      await list('current', 3, 2),
    ];
    const ids = pages.flatMap((p) => p.data.map((m) => m.contractMemberId));
    expect(new Set(ids).size).toBe(5);
    expect(ids).toEqual([...ids].sort());
    expect(pages.map((p) => p.pagination.totalItems)).toEqual([5, 5, 5]);
    expect(pages[1].pagination).toMatchObject({
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
    expect(await list('current', 4, 2)).toMatchObject({
      data: [],
      pagination: { totalItems: 5, totalPages: 3, hasNextPage: false },
    });
    expect(await list('history')).toMatchObject({
      data: [],
      pagination: { totalItems: 0, totalPages: 0 },
    });
  });
});
