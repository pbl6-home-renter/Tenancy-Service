import { MatchRequestEntity } from '../../../domain/entities/match-request.entity';
import { MatchRequestTypeormEntity } from '../match-request.typeorm-entity';

export class MatchRequestMapper {
  static toDomain(row: MatchRequestTypeormEntity): MatchRequestEntity {
    return MatchRequestEntity.reconstitute({ ...row });
  }

  static toPersistence(request: MatchRequestEntity): MatchRequestTypeormEntity {
    const [pairLowId, pairHighId] = [
      request.requesterId,
      request.targetId,
    ].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    return Object.assign(new MatchRequestTypeormEntity(), {
      id: request.id,
      requesterId: request.requesterId,
      targetId: request.targetId,
      pairLowId,
      pairHighId,
      idempotencyKey: request.idempotencyKey,
      status: request.status,
      respondedAt: request.respondedAt,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      isDeleted: request.isDeleted,
    });
  }
}
