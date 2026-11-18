import { RoomGetDetailQueryHandler } from 'modules/room/application/queries/room-get-detail/room-get-detail.query.handler';
import { RoomGetDetailQuery } from 'modules/room/application/queries/room-get-detail/room-get-detail.query';
import { RoomDetailResult } from 'modules/room/application/queries/room-get-detail/room-get-detail.result';
import { RoomReadRepository } from 'modules/room/infrastructure/persistence/room-read.repository';
import { RoomPublicListResponseDto } from 'modules/room/presentation/http/responses/room-public-list.response.dto';
import { RoomDetailResponseDto } from 'modules/room/presentation/http/responses/room-detail.response.dto';
import { IdentityLandlordContactAdapter } from 'modules/room/infrastructure/users/identity-landlord-contact.adapter';
import { IInternalHttpClient } from 'shared/application/ports/internal-http-client.port';
import { PeerServiceUnavailableException } from 'shared/application/http/peer-service.exception';
import { PeerService } from 'shared/application/http/peer-service.enum';
import { BuildingStatus } from 'modules/building/domain/enums/building-status.enum';
import { GenderPolicy } from 'modules/room/domain/enums/gender-policy.enum';
import { RoomStatus } from 'modules/room/domain/enums/room-status.enum';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

// Swagger's ESM decorators do not participate in DTO serialization behavior.
jest.mock('@nestjs/swagger', () => ({
  ApiProperty: () => () => undefined,
  ApiPropertyOptional: () => () => undefined,
}));

function setup() {
  const landlord = { id: generateUuid(), name: 'Owner', phone: '0912345678' };
  const room: RoomDetailResult = {
    id: generateUuid(),
    landlordId: landlord.id,
    landlord: null,
    buildingId: generateUuid(),
    buildingName: 'Building A',
    address: '12 Street',
    ward: 'Ward A',
    province: 'City A',
    name: '101',
    area: '25',
    rentPrice: 3000000,
    isFavorited: true,
    photoMediaIds: [],
    photoUrls: [],
    buildingStatus: BuildingStatus.APPROVED,
    buildingIsDeleted: false,
    description: null,
    floorNumber: 1,
    depositAmount: 0,
    status: RoomStatus.AVAILABLE,
    maxOccupancy: 2,
    genderPolicy: GenderPolicy.ANY,
    amenities: {},
  };
  const repository = {
    findDetailAccessById: jest.fn(async () => room),
    findDetailById: jest.fn(async () => room),
  };
  const media = {
    findMedia: jest.fn(),
    findMediaByOwner: jest.fn(),
    findMediaByIds: jest.fn(async () => []),
  };
  const contacts = {
    findById: jest.fn(async () => landlord as typeof landlord | null),
  };
  const handler = new RoomGetDetailQueryHandler(
    repository as unknown as RoomReadRepository,
    media,
    contacts,
  );
  return { landlord, room, repository, media, contacts, handler };
}

describe('Public room responses', () => {
  it('serializes building address and favorite state without losing ward, and supplies landlord contact for anonymous detail', async () => {
    const s = setup();
    const detail = RoomDetailResponseDto.fromReadModel(
      await s.handler.execute(new RoomGetDetailQuery(s.room.id)),
    );
    expect(detail).toMatchObject({
      address: '12 Street',
      ward: 'Ward A',
      province: 'City A',
      buildingName: 'Building A',
      landlord: s.landlord,
    });
    const list = RoomPublicListResponseDto.fromReadModel(s.room);
    expect(list).toMatchObject({
      ward: 'Ward A',
      buildingName: 'Building A',
      isFavorited: true,
      photoUrls: [],
      thumbnailUrl: null,
    });
    expect(JSON.parse(JSON.stringify(detail))).not.toHaveProperty(
      'landlord.email',
    );
  });

  it('checks room visibility before looking up contact and media', async () => {
    const s = setup();
    s.room.buildingIsDeleted = true;
    await expect(
      s.handler.execute(new RoomGetDetailQuery(s.room.id)),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(s.contacts.findById).not.toHaveBeenCalled();
    expect(s.media.findMediaByIds).not.toHaveBeenCalled();
  });

  it('returns 404 for missing/deleted owners and propagates Identity outage', async () => {
    const s = setup();
    s.contacts.findById.mockResolvedValueOnce(null);
    await expect(
      s.handler.execute(new RoomGetDetailQuery(s.room.id)),
    ).rejects.toMatchObject({ statusCode: 404 });
    s.contacts.findById.mockRejectedValueOnce(
      new PeerServiceUnavailableException(PeerService.IDENTITY, 'timeout'),
    );
    await expect(
      s.handler.execute(new RoomGetDetailQuery(s.room.id)),
    ).rejects.toMatchObject({ statusCode: 503 });
  });

  it('maps only landlord public contact from the Identity response', async () => {
    const id = generateUuid();
    const client = {
      get: jest.fn(async () => [
        {
          id,
          name: 'Owner',
          phone: '0912345678',
          role: UserRole.LANDLORD,
          isDeleted: false,
          email: 'private@example.com',
        },
      ]),
    };
    const adapter = new IdentityLandlordContactAdapter(
      client as unknown as IInternalHttpClient,
    );
    expect(await adapter.findById(id)).toEqual({
      id,
      name: 'Owner',
      phone: '0912345678',
    });
    expect(await adapter.findById(generateUuid())).toBeNull();
    client.get.mockResolvedValueOnce([
      {
        id,
        name: 'Owner',
        phone: '0912345678',
        role: UserRole.TENANT,
        isDeleted: false,
        email: 'private@example.com',
      },
    ]);
    expect(await adapter.findById(id)).toBeNull();
  });
});
