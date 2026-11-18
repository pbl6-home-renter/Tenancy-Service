jest.mock('@nestjs/swagger', () => ({
  ApiProperty: () => () => undefined,
}));

import {
  MatchRequestListResponseDto,
  MatchRequestParticipantResponseDto,
} from 'modules/match-request/presentation/http/responses/match-request.response.dto';
import { MatchRequestEntity } from 'modules/match-request/domain/entities/match-request.entity';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('match request list response DTO', () => {
  it('includes requester and target summaries', () => {
    const request = MatchRequestEntity.create(
      generateUuid(),
      generateUuid(),
      generateUuid(),
    );
    const requester = {
      id: request.requesterId,
      name: 'Requester',
      avatarUrl: 'https://example.com/requester.png',
    };
    const target = {
      id: request.targetId,
      name: 'Target',
      avatarUrl: null,
    };

    const result = MatchRequestListResponseDto.fromListItem({
      request,
      requester,
      target,
    });

    expect(result.requester).toBeInstanceOf(MatchRequestParticipantResponseDto);
    expect(result.requester).toEqual(requester);
    expect(result.target).toBeInstanceOf(MatchRequestParticipantResponseDto);
    expect(result.target).toEqual(target);
    expect(result).toMatchObject({
      id: request.id,
      requesterId: request.requesterId,
      targetId: request.targetId,
      status: request.status,
    });
  });
});
