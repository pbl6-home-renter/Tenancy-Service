import type { JWTPayload } from 'jose';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { UserStatus } from 'shared/domain/enums/user-status.enum';

export interface JwtPayload extends JWTPayload {
  sub?: string;
  role?: UserRole;
  status?: UserStatus;
}
