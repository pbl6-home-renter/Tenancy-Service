import { Inject, Injectable } from '@nestjs/common';
import { INTERNAL_HTTP_DI_TOKEN } from 'shared/application/di-tokens';
import { PeerService } from 'shared/application/http/peer-service.enum';
import { PeerServiceUnavailableException } from 'shared/application/http/peer-service.exception';
import { IInternalHttpClient } from 'shared/application/ports/internal-http-client.port';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  LandlordContact,
  LandlordContactPort,
} from '../../application/ports/landlord-contact.port';

interface IdentityContact extends LandlordContact {
  role: UserRole;
  isDeleted: boolean;
}

@Injectable()
export class IdentityLandlordContactAdapter implements LandlordContactPort {
  constructor(
    @Inject(INTERNAL_HTTP_DI_TOKEN.CLIENT)
    private readonly client: IInternalHttpClient,
  ) {}

  async findById(id: Uuid): Promise<LandlordContact | null> {
    const users = await this.client.get<IdentityContact[]>(
      PeerService.IDENTITY,
      '/internal/users',
      {
        query: { ids: id },
      },
    );
    const user = users.find(
      (item) =>
        item.id === id &&
        item.role === UserRole.LANDLORD &&
        item.isDeleted === false,
    );
    if (
      user &&
      (typeof user.name !== 'string' ||
        !user.name.trim() ||
        typeof user.phone !== 'string' ||
        !user.phone.trim())
    ) {
      throw new PeerServiceUnavailableException(
        PeerService.IDENTITY,
        'Invalid landlord contact response',
      );
    }
    return user ? { id: user.id, name: user.name, phone: user.phone } : null;
  }
}
