import { AggregateRoot } from 'shared/domain/base/aggregate-root';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import {
  generateUuid,
  isValidUuid,
  Uuid,
} from 'shared/domain/value-objects/uuid.vo';
import { TenantIdentityInvalidException } from '../exceptions/tenant-identity-invalid.exception';
import { MemberLeftException } from '../exceptions/member-left.exception';
import { MemberAlreadyLeftException } from '../exceptions/member-already-left.exception';
import { LeftDateInvalidException } from '../exceptions/left-date-invalid.exception';
import { ContractMemberAddedEvent } from '../events/contract-member-added.event';
import { ContractMemberLeftEvent } from '../events/contract-member-left.event';
import { ContractMemberLinkedEvent } from '../events/contract-member-linked.event';
import { TenantPhone } from '../value-objects/tenant-phone.vo';
import {
  AddContractMemberProps,
  ContractMemberProps,
} from './contract-member.props';

export class ContractMember extends AggregateRoot {
  private constructor(
    id: Uuid,
    private readonly _contractId: Uuid,
    private _tenantId: Uuid | null,
    private readonly _tenantName: string | null,
    private _tenantPhone: TenantPhone | null,
    private readonly _joinedAt: Date,
    private _leftAt: Date | null,
    createdAt: Date,
    updatedAt: Date,
    isDeleted: boolean,
  ) {
    super(id, createdAt, updatedAt, isDeleted);
  }

  static add(input: AddContractMemberProps): ContractMember {
    const now = new Date();
    const member = this.reconstitute({
      ...input,
      id: generateUuid(),
      leftAt: null,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    });
    member.addDomainEvent(
      new ContractMemberAddedEvent(
        member.id,
        member.contractId,
        member.tenantId,
        member.joinedAt,
      ),
    );
    return member;
  }

  static reconstitute(props: ContractMemberProps): ContractMember {
    if (
      !isValidUuid(props.id) ||
      !isValidUuid(props.contractId) ||
      (props.tenantId !== null && !isValidUuid(props.tenantId))
    ) {
      throw new ValidationException('Invalid member UUID');
    }
    if (
      props.tenantId === null &&
      (typeof props.tenantName !== 'string' ||
        !props.tenantName.trim() ||
        !props.tenantPhone)
    ) {
      throw new TenantIdentityInvalidException();
    }
    if (
      props.tenantName !== null &&
      (typeof props.tenantName !== 'string' ||
        !props.tenantName.trim() ||
        [...props.tenantName].length > 254)
    ) {
      throw new ValidationException('tenantName must contain 1–254 characters');
    }
    const tenantPhone =
      props.tenantPhone === null ? null : TenantPhone.create(props.tenantPhone);
    this.assertDate('joinedAt', props.joinedAt);
    const joinedAt = new Date(props.joinedAt);
    joinedAt.setUTCHours(0, 0, 0, 0);
    let leftAt: Date | null = null;
    if (props.leftAt !== null) {
      this.assertDate('leftAt', props.leftAt);
      leftAt = new Date(props.leftAt);
      leftAt.setUTCHours(0, 0, 0, 0);
      if (leftAt.getTime() < joinedAt.getTime())
        throw new LeftDateInvalidException();
    }
    if (
      !(props.createdAt instanceof Date) ||
      Number.isNaN(props.createdAt.getTime()) ||
      !(props.updatedAt instanceof Date) ||
      Number.isNaN(props.updatedAt.getTime())
    ) {
      throw new ValidationException('Invalid member timestamps');
    }
    return new ContractMember(
      props.id,
      props.contractId,
      props.tenantId,
      props.tenantName,
      tenantPhone,
      joinedAt,
      leftAt,
      new Date(props.createdAt),
      new Date(props.updatedAt),
      props.isDeleted,
    );
  }

  get contractId(): Uuid {
    return this._contractId;
  }

  get tenantId(): Uuid | null {
    return this._tenantId;
  }

  get tenantName(): string | null {
    return this._tenantName;
  }

  get tenantPhone(): TenantPhone | null {
    return this._tenantPhone;
  }

  get joinedAt(): Date {
    return new Date(this._joinedAt);
  }

  get leftAt(): Date | null {
    return this._leftAt === null ? null : new Date(this._leftAt);
  }

  get status(): 'active' | 'left' {
    return this.isActive() ? 'active' : 'left';
  }

  isActive(today = new Date()): boolean {
    const startOfDay = new Date(today);
    startOfDay.setUTCHours(0, 0, 0, 0);
    return (
      this._leftAt === null || this._leftAt.getTime() > startOfDay.getTime()
    );
  }

  linkTenant(userId: Uuid, phone: TenantPhone): boolean {
    if (
      this.isDeleted ||
      this._tenantId !== null ||
      !this._tenantPhone?.equals(phone)
    ) {
      return false;
    }
    this._tenantId = userId;
    this.touch();
    this.addDomainEvent(
      new ContractMemberLinkedEvent(
        this.id,
        this.contractId,
        userId,
        this.joinedAt,
      ),
    );
    return true;
  }

  updatePhone(phone: TenantPhone | null): void {
    if (!this.isActive()) throw new MemberLeftException();
    if (phone === null && this.tenantId === null)
      throw new TenantIdentityInvalidException();
    this._tenantPhone = phone;
    this.touch();
  }

  leave(leftOn: Date, replaceScheduledLeave = false): void {
    if (this.leftAt !== null && (!replaceScheduledLeave || !this.isActive())) {
      throw new MemberAlreadyLeftException();
    }
    try {
      ContractMember.assertDate('leftOn', leftOn);
    } catch {
      throw new LeftDateInvalidException();
    }
    const leftAt = new Date(leftOn);
    leftAt.setUTCHours(0, 0, 0, 0);
    if (leftAt.getTime() < this._joinedAt.getTime())
      throw new LeftDateInvalidException();
    this._leftAt = leftAt;
    this.touch();
    this.addDomainEvent(
      new ContractMemberLeftEvent(
        this.id,
        this.contractId,
        this.tenantId,
        new Date(leftAt),
      ),
    );
  }

  private touch(): void {
    this.updatedAt.setTime(Date.now());
  }

  private static assertDate(field: string, value: Date): void {
    if (
      !(value instanceof Date) ||
      Number.isNaN(value.getTime()) ||
      value.getUTCFullYear() < 1 ||
      value.getUTCFullYear() > 9999
    ) {
      throw new ValidationException(`${field} must be a valid Date`);
    }
  }
}
