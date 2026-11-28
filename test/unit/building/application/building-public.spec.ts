import { BuildingSearchPublicQueryHandler } from 'modules/building/application/queries/building-search-public/building-search-public.query.handler';
import { BuildingGetPublicQueryHandler } from 'modules/building/application/queries/building-get-public/building-get-public.query.handler';
import { BuildingNotFoundException } from 'modules/building/domain/exceptions/building-not-found.exception';
import { BuildingRepository } from 'modules/building/domain/repositories/building.repository';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('public building queries', () => {
  it('preserves filters and pagination when delegating to the visibility-filtered search', async () => {
    const page = { data: [], pagination: { totalItems: 0 } };
    const findPublicBuildings = jest.fn().mockResolvedValue(page);
    const handler = new BuildingSearchPublicQueryHandler({
      findPublicBuildings,
    } as unknown as BuildingRepository);
    const options = {
      pageNo: 2,
      pageSize: 10,
      filter: { province: 'Da Nang', q: 'Building' },
    };
    expect(await handler.execute({ options })).toBe(page);
    expect(findPublicBuildings).toHaveBeenCalledWith(options);
  });

  it('returns the same not-found error for a hidden building as an absent building', async () => {
    const buildingId = generateUuid();
    const findPublicBuildingById = jest.fn().mockResolvedValue(null);
    const handler = new BuildingGetPublicQueryHandler({
      findPublicBuildingById,
    } as unknown as BuildingRepository);
    await expect(handler.execute({ buildingId })).rejects.toThrow(
      BuildingNotFoundException,
    );
    expect(findPublicBuildingById).toHaveBeenCalledWith(buildingId);
  });
});
