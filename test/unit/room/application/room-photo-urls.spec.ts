import { roomPhotoUrls } from 'modules/room/application/room-photo-urls';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('Room photo URLs', () => {
  it('keeps attachment order and excludes wrong owner, incomplete, private metadata and unrelated purpose', () => {
    const roomId = generateUuid();
    const media = [0, 1, 2, 3, 4, 5].map(() => ({
      id: generateUuid(),
      ownerType: 'room',
      ownerId: roomId,
      status: 'uploaded',
      purpose: 'gallery_photo',
      url: 'https://images.example.com/photo.jpg',
    }));
    media[0].ownerId = generateUuid();
    media[1].status = 'pending';
    media[2].url = `/api/v1/media/${media[2].id}`;
    media[3].purpose = 'contract_signed';
    media[4].url = 'https://images.example.com/four.jpg';
    media[5].url = 'https://images.example.com/five.jpg';
    expect(
      roomPhotoUrls(
        roomId,
        [media[5].id, ...media.slice(0, 5).map((item) => item.id)],
        media,
      ),
    ).toEqual([media[5].url, media[4].url]);
  });
});
