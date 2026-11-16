import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternalHttpModule } from 'shared/infrastructure/http/internal-http.module';
import { RoommateProfileEntity } from './infrastructure/persistence/roommate-profile.entity';
import { RoommateProfileController } from './presentation/http/roommate-profile.controller';
import { RoommateProfileService } from './roommate-profile.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoommateProfileEntity]),
    InternalHttpModule,
  ],
  controllers: [RoommateProfileController],
  providers: [RoommateProfileService],
})
export class RoommateProfileModule {}
