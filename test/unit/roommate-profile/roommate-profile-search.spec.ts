import 'reflect-metadata';
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { RoommateProfileEntity } from 'modules/roommate-profile/infrastructure/persistence/roommate-profile.entity';
import { RoommateProfileService } from 'modules/roommate-profile/application/roommate-profile.service';
import { TypeOrmRoommateProfileRepository } from 'modules/roommate-profile/infrastructure/persistence/roommate-profile.repository';
import { IdentityTenantDirectoryAdapter } from 'modules/roommate-profile/infrastructure/users/identity-tenant-directory.adapter';
import { SnakeNamingStrategy } from 'shared/infrastructure/database/snake-naming.strategy';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { UserStatus } from 'shared/domain/enums/user-status.enum';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';
import { RoommateProfileRepositoryPort } from 'modules/roommate-profile/application/ports/roommate-profile.repository.port';
import { TenantDirectoryPort } from 'modules/roommate-profile/application/ports/tenant-directory.port';

describe('roommate profile search', () => {
  it('lets an owner read a hidden profile while direct public detail stays hidden', async () => {
    const tenantId = generateUuid();
    const own = Object.assign(new RoommateProfileEntity(), {
      id: generateUuid(),
      tenantId,
      isVisible: false,
      bio: null,
    });
    const repository = {
      findOwn: jest.fn().mockResolvedValue(own),
      findDiscoverable: jest.fn().mockResolvedValue(null),
    } as unknown as RoommateProfileRepositoryPort;
    const directory = {
      findActive: jest.fn().mockResolvedValue(
        new Map([
          [
            tenantId.toLowerCase(),
            {
              id: tenantId,
              name: 'Tenant',
              avatarUrl: null,
            },
          ],
        ]),
      ),
    } as unknown as TenantDirectoryPort;
    const service = new RoommateProfileService(repository, directory);
    expect(await service.mine(tenantId)).toMatchObject({ isVisible: false });
    await expect(service.detail(tenantId, own.id)).rejects.toMatchObject({
      code: 'ROOMMATE_PROFILE_NOT_FOUND',
    });
  });

  it('checks live occupancy and filters inactive Identity users before pagination', async () => {
    const db = new DataSource({
      type: 'postgres',
      namingStrategy: new SnakeNamingStrategy(),
      entities: [RoommateProfileEntity],
    });
    await (
      db as unknown as { buildMetadatas(): Promise<void> }
    ).buildMetadatas();
    const viewerId = generateUuid();
    const tenantId = generateUuid();
    const inactiveId = generateUuid();
    const profile = (id: string) =>
      Object.assign(new RoommateProfileEntity(), {
        id: generateUuid(),
        tenantId: id,
        isVisible: true,
        bio: 'Hello',
      });
    let sql = '';
    const rows = jest
      .spyOn(SelectQueryBuilder.prototype, 'getMany')
      .mockImplementation(function (
        this: SelectQueryBuilder<RoommateProfileEntity>,
      ) {
        sql = this.getQuery();
        return Promise.resolve([profile(inactiveId), profile(tenantId)]);
      });
    const client = {
      get: jest.fn(
        async (
          _service: unknown,
          _path: string,
          options: { query: { ids: string } },
        ) =>
          options.query.ids.split(',').map((id) => ({
            id,
            name: 'Tenant',
            role: UserRole.TENANT,
            status: id === inactiveId ? UserStatus.LOCKED : UserStatus.ACTIVE,
            isDeleted: false,
            avatarUrl: null,
          })),
      ),
    };
    try {
      const service = new RoommateProfileService(
        new TypeOrmRoommateProfileRepository(
          db.getRepository(RoommateProfileEntity),
        ),
        new IdentityTenantDirectoryAdapter(client as never),
      );
      const result = await service.search(viewerId, {
        pageNo: 1,
        pageSize: 20,
      });
      expect(sql).toContain('r.max_occupancy');
      expect(sql).toContain('COUNT(DISTINCT COALESCE(cm.tenant_id, cm.id))');
      expect(sql).toContain('cm.left_at > CURRENT_DATE');
      expect(sql).toContain('"p"."tenant_id" != :viewerId');
      expect(result.pagination.totalItems).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({ tenantId, tenantName: 'Tenant' });
      expect(result.data[0]).not.toHaveProperty('isDeleted');
    } finally {
      rows.mockRestore();
    }
  });
});
