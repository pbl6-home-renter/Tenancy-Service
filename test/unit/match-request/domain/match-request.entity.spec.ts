import { MatchRequestEntity } from 'modules/match-request/domain/entities/match-request.entity';
import { MatchRequestStatus } from 'modules/match-request/domain/enums/match-request-status.enum';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';
import { MATCH_REQUEST_EVENTS } from 'modules/match-request/domain/constants/match-request-event.constants';

describe('match request state machine', () => {
  it('allows only the recipient to accept or reject, and treats the same action as a retry', () => {
    const requesterId = generateUuid();
    const targetId = generateUuid();
    const request = MatchRequestEntity.create(
      requesterId,
      targetId,
      generateUuid(),
    );
    expect(request.pullDomainEvents()[0]).toMatchObject({
      eventType: MATCH_REQUEST_EVENTS.CREATED,
      payload: {
        matchRequestId: request.id,
        actorUserId: requesterId,
        recipientUserId: targetId,
      },
    });

    expect(() =>
      request.transition(requesterId, MatchRequestStatus.ACCEPTED),
    ).toThrow();
    expect(request.status).toBe(MatchRequestStatus.PENDING);
    expect(request.transition(targetId, MatchRequestStatus.ACCEPTED)).toBe(
      true,
    );
    const respondedAt = request.respondedAt;
    expect(request.pullDomainEvents()[0]).toMatchObject({
      eventType: MATCH_REQUEST_EVENTS.ACCEPTED,
      payload: {
        matchRequestId: request.id,
        actorUserId: targetId,
        recipientUserId: requesterId,
      },
    });
    expect(request.transition(targetId, MatchRequestStatus.ACCEPTED)).toBe(
      false,
    );
    expect(request.respondedAt).toBe(respondedAt);
    expect(request.pullDomainEvents()).toEqual([]);
    expect(() =>
      request.transition(targetId, MatchRequestStatus.REJECTED),
    ).toThrow();
    expect(() =>
      request.transition(requesterId, MatchRequestStatus.WITHDRAWN),
    ).toThrow();
  });

  it('lets only the requester withdraw and sends the event to the target', () => {
    const requesterId = generateUuid();
    const targetId = generateUuid();
    const request = MatchRequestEntity.create(
      requesterId,
      targetId,
      generateUuid(),
    );
    request.pullDomainEvents();
    expect(() =>
      request.transition(targetId, MatchRequestStatus.WITHDRAWN),
    ).toThrow();
    expect(request.transition(requesterId, MatchRequestStatus.WITHDRAWN)).toBe(
      true,
    );
    expect(request.pullDomainEvents()[0]).toMatchObject({
      eventType: MATCH_REQUEST_EVENTS.WITHDRAWN,
      payload: {
        matchRequestId: request.id,
        actorUserId: requesterId,
        recipientUserId: targetId,
      },
    });
    expect(request.transition(requesterId, MatchRequestStatus.WITHDRAWN)).toBe(
      false,
    );
  });

  it('rejects self matching', () => {
    const id = generateUuid();
    expect(() => MatchRequestEntity.create(id, id, generateUuid())).toThrow();
  });

  it('emits a rejected event to the requester when the target rejects', () => {
    const requesterId = generateUuid();
    const targetId = generateUuid();
    const request = MatchRequestEntity.create(
      requesterId,
      targetId,
      generateUuid(),
    );
    request.pullDomainEvents();
    request.transition(targetId, MatchRequestStatus.REJECTED);
    expect(request.pullDomainEvents()[0]).toMatchObject({
      eventType: MATCH_REQUEST_EVENTS.REJECTED,
      routingKey: MATCH_REQUEST_EVENTS.REJECTED,
      payload: {
        matchRequestId: request.id,
        actorUserId: targetId,
        recipientUserId: requesterId,
      },
    });
  });
});
