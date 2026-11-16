import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { InternalHttpModule } from 'shared/infrastructure/http/internal-http.module';
import { RoommateProfileEntity } from './infrastructure/persistence/roommate-profile.entity';
import { TypeOrmRoommateProfileRepository } from './infrastructure/persistence/roommate-profile.repository';
import { IdentityTenantDirectoryAdapter } from './infrastructure/users/identity-tenant-directory.adapter';
import { RoommateProfileController } from './presentation/http/roommate-profile.controller';
import { RoommateProfileService } from './application/roommate-profile.service';
import { ROOMMATE_PROFILE_DI_TOKEN } from './roommate-profile.di-token';
import { RoommateProfileSaveCommandHandler } from './application/commands/roommate-profile-save/roommate-profile-save.command.handler';
import { RoommateProfileGetMyQueryHandler } from './application/queries/roommate-profile-get-my/roommate-profile-get-my.query.handler';
import { RoommateProfileGetByIdQueryHandler } from './application/queries/roommate-profile-get-by-id/roommate-profile-get-by-id.query.handler';
import { RoommateProfileSearchQueryHandler } from './application/queries/roommate-profile-search/roommate-profile-search.query.handler';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([RoommateProfileEntity]),
    InternalHttpModule,
  ],
  controllers: [RoommateProfileController],
  providers: [
    RoommateProfileService,
    RoommateProfileSaveCommandHandler,
    RoommateProfileGetMyQueryHandler,
    RoommateProfileGetByIdQueryHandler,
    RoommateProfileSearchQueryHandler,
    {
      provide: ROOMMATE_PROFILE_DI_TOKEN.REPOSITORY,
      useClass: TypeOrmRoommateProfileRepository,
    },
    {
      provide: ROOMMATE_PROFILE_DI_TOKEN.READ_REPOSITORY,
      useExisting: ROOMMATE_PROFILE_DI_TOKEN.REPOSITORY,
    },
    {
      provide: ROOMMATE_PROFILE_DI_TOKEN.TENANT_DIRECTORY,
      useClass: IdentityTenantDirectoryAdapter,
    },
  ],
  exports: [
    ROOMMATE_PROFILE_DI_TOKEN.READ_REPOSITORY,
    ROOMMATE_PROFILE_DI_TOKEN.TENANT_DIRECTORY,
  ],
})
export class RoommateProfileModule {}
