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
import { SaveRoommateProfileCommandHandler } from './application/commands/save-roommate-profile/save-roommate-profile.command.handler';
import { GetMyRoommateProfileQueryHandler } from './application/queries/get-my-roommate-profile/get-my-roommate-profile.query.handler';
import { GetRoommateProfileQueryHandler } from './application/queries/get-roommate-profile/get-roommate-profile.query.handler';
import { SearchRoommateProfilesQueryHandler } from './application/queries/search-roommate-profiles/search-roommate-profiles.query.handler';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([RoommateProfileEntity]),
    InternalHttpModule,
  ],
  controllers: [RoommateProfileController],
  providers: [
    RoommateProfileService,
    SaveRoommateProfileCommandHandler,
    GetMyRoommateProfileQueryHandler,
    GetRoommateProfileQueryHandler,
    SearchRoommateProfilesQueryHandler,
    {
      provide: ROOMMATE_PROFILE_DI_TOKEN.REPOSITORY,
      useClass: TypeOrmRoommateProfileRepository,
    },
    {
      provide: ROOMMATE_PROFILE_DI_TOKEN.TENANT_DIRECTORY,
      useClass: IdentityTenantDirectoryAdapter,
    },
  ],
})
export class RoommateProfileModule {}
