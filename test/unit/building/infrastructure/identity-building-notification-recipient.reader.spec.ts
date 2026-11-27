import { IdentityBuildingNotificationRecipientReader } from 'modules/building/infrastructure/services/identity-building-notification-recipient.reader';
import { Logger } from '@nestjs/common';
import { PeerService } from 'shared/application/http/peer-service.enum';
import { PeerServiceUnavailableException } from 'shared/application/http/peer-service.exception';
import { IInternalHttpClient } from 'shared/application/ports/internal-http-client.port';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('IdentityBuildingNotificationRecipientReader', () => {
  it('uses the active admin list and resolves the landlord name before returning recipients', async () => {
    const landlordId = generateUuid();
    const adminIds = [generateUuid(), generateUuid()];
    const get = jest
      .fn()
      .mockResolvedValueOnce({ ids: adminIds })
      .mockResolvedValueOnce([{ id: landlordId, name: 'Chủ nhà A' }]);
    const reader = new IdentityBuildingNotificationRecipientReader({
      get,
    } as unknown as IInternalHttpClient);

    await expect(reader.findForLandlord(landlordId)).resolves.toEqual({
      adminIds,
      landlordName: 'Chủ nhà A',
    });
    expect(get).toHaveBeenNthCalledWith(
      1,
      PeerService.IDENTITY,
      '/internal/users/admins/active-ids',
    );
    expect(get).toHaveBeenNthCalledWith(
      2,
      PeerService.IDENTITY,
      '/internal/users',
      { query: { ids: landlordId } },
    );
  });

  it('does not request landlord details when no admin is active', async () => {
    const get = jest.fn().mockResolvedValue({ ids: [] });
    const reader = new IdentityBuildingNotificationRecipientReader({
      get,
    } as unknown as IInternalHttpClient);

    await expect(reader.findForLandlord(generateUuid())).resolves.toBeNull();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('logs and skips the notification when Identity omits the landlord name', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const get = jest
      .fn()
      .mockResolvedValueOnce({ ids: [generateUuid()] })
      .mockResolvedValueOnce([]);
    const reader = new IdentityBuildingNotificationRecipientReader({
      get,
    } as unknown as IInternalHttpClient);

    await expect(reader.findForLandlord(generateUuid())).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith(
      'Identity lookup failed; building notification skipped.',
    );
    warn.mockRestore();
  });

  it('logs and skips the notification when the Identity request fails', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const get = jest
      .fn()
      .mockRejectedValue(
        new PeerServiceUnavailableException(
          PeerService.IDENTITY,
          'Unavailable',
        ),
      );
    const reader = new IdentityBuildingNotificationRecipientReader({
      get,
    } as unknown as IInternalHttpClient);

    await expect(reader.findForLandlord(generateUuid())).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith(
      'Identity lookup failed; building notification skipped.',
    );
    warn.mockRestore();
  });
});
