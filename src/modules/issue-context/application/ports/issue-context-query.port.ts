import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { UserRole } from 'shared/domain/enums/user-role.enum';

export const ISSUE_CONTEXT_QUERY = Symbol('ISSUE_CONTEXT_QUERY');

export interface IssueContext {
  contractId: Uuid;
  roomId: Uuid;
  roomName: string;
  buildingId: Uuid;
  buildingName: string;
  landlordId: Uuid;
  contractStatus: string;
  participantUserIds: Uuid[];
}

export interface IssueContextQueryPort {
  findByRoom(roomId: Uuid): Promise<IssueContext | null>;
  findByContract(contractId: Uuid): Promise<IssueContext | null>;
  findVisibleContractIds(userId: Uuid, role: UserRole): Promise<Uuid[]>;
}
