import { SetMetadata } from '@nestjs/common';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { AuthMetadataKeys } from './auth-metadata.keys';

export const Public = () => SetMetadata(AuthMetadataKeys.IS_PUBLIC, true);

export const Roles = (...roles: UserRole[]) =>
  SetMetadata(AuthMetadataKeys.ROLES, roles);

export const AllowLocked = (...roles: UserRole[]) =>
  SetMetadata(AuthMetadataKeys.ALLOW_LOCKED, roles);
