import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LANDLORD_LOCK } from './application/ports/landlord-lock.port';
import { LandlordIsLockedQueryHandler } from './application/queries/landlord-is-locked.query.handler';
import { LandlordLockStateTypeormEntity } from './infrastructure/persistence/landlord-lock-state.typeorm-entity';
import { TypeOrmLandlordLockRepository } from './infrastructure/persistence/landlord-lock.repository';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([LandlordLockStateTypeormEntity]),
  ],
  providers: [
    { provide: LANDLORD_LOCK, useClass: TypeOrmLandlordLockRepository },
    LandlordIsLockedQueryHandler,
  ],
  exports: [LANDLORD_LOCK],
})
export class LandlordLockModule {}
