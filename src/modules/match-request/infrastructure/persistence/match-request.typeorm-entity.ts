import { Check, Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MatchRequestStatus } from '../../domain/enums/match-request-status.enum';

@Entity('match_requests')
@Index('UQ_match_requests_request_key', ['requesterId', 'idempotencyKey'], {
  unique: true,
})
@Index('UQ_match_requests_pending_pair', ['pairLowId', 'pairHighId'], {
  unique: true,
  where: "status = 'pending' AND is_deleted = false",
})
@Index('IDX_match_requests_requester_created', ['requesterId', 'createdAt'])
@Index('IDX_match_requests_target_created', ['targetId', 'createdAt'])
@Check(
  'CHK_match_requests_status',
  "status IN ('pending', 'accepted', 'rejected', 'withdrawn')",
)
@Check('CHK_match_requests_pair_order', 'pair_low_id < pair_high_id')
@Check(
  'CHK_match_requests_responded_at',
  "(status = 'pending' AND responded_at IS NULL) OR (status <> 'pending' AND responded_at IS NOT NULL)",
)
export class MatchRequestTypeormEntity extends AbstractEntity {
  @Column({ type: 'uuid' }) requesterId: Uuid;
  @Column({ type: 'uuid' }) targetId: Uuid;
  @Column({ type: 'uuid' }) pairLowId: Uuid;
  @Column({ type: 'uuid' }) pairHighId: Uuid;
  @Column({ type: 'uuid' }) idempotencyKey: Uuid;
  @Column({ type: 'varchar', length: 16 }) status: MatchRequestStatus;
  @Column({ type: 'timestamptz', nullable: true }) respondedAt: Date | null;
}
