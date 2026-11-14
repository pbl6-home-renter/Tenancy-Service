import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BuildingListMineQuery } from 'modules/building/application/queries/building-list-mine/building-list-mine.query';
import { BuildingListMineQueryHandler } from 'modules/building/application/queries/building-list-mine/building-list-mine.query.handler';
import { BuildingRepository } from 'modules/building/domain/repositories/building.repository';
import { escapeLikePattern } from 'modules/building/infrastructure/persistence/escape-like-pattern';
import { MyBuildingFilterRequestDto } from 'modules/building/presentation/http/requests/building-list-mine.query.request.dto';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

jest.mock('@nestjs/swagger', () => ({ ApiPropertyOptional: () => () => undefined }));

describe('building search', () => {
  it('escapes backslash and wildcard characters as literal input', () => {
    expect(escapeLikePattern('A\\B%_')).toBe('A\\\\B\\%\\_');
  });

  it('trims search, ignores whitespace-only input and rejects long strings', async () => {
    const filter = plainToInstance(MyBuildingFilterRequestDto, {
      search: '  An Bình  ',
    });
    expect(filter.search).toBe('An Bình');
    expect(await validate(filter)).toHaveLength(0);
    const empty = plainToInstance(MyBuildingFilterRequestDto, {
      search: '   ',
    });
    expect(empty.search).toBeUndefined();
    const long = plainToInstance(MyBuildingFilterRequestDto, {
      search: 'x'.repeat(101),
    });
    expect(await validate(long)).not.toHaveLength(0);
  });

  it('passes search and other pagination options to the repository', async () => {
    const repository = {
      findMyBuildings: jest
        .fn()
        .mockResolvedValue({ data: [], pagination: {} }),
    };
    const handler = new BuildingListMineQueryHandler(
      repository as unknown as BuildingRepository,
    );
    const landlordId = generateUuid();
    const options = { pageNo: 2, pageSize: 20, filter: { search: 'An Bình' } };
    await handler.execute(new BuildingListMineQuery(landlordId, options));
    expect(repository.findMyBuildings).toHaveBeenCalledWith(
      landlordId,
      options,
    );
  });
});
