import { SetMetadata } from '@nestjs/common';
import { AuthMetadataKeys } from './auth-metadata.keys';

export const InternalOnly = () =>
  SetMetadata(AuthMetadataKeys.INTERNAL_ONLY, true);
