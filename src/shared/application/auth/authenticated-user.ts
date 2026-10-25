import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { UserStatus } from 'shared/domain/enums/user-status.enum';

export interface AuthenticatedUser {
  id: Uuid;
  role: UserRole;
  status: UserStatus;
}
