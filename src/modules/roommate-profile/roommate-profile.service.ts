import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { INTERNAL_HTTP_DI_TOKEN } from 'shared/application/di-tokens';
import { PeerService } from 'shared/application/http/peer-service.enum';
import { IInternalHttpClient } from 'shared/application/ports/internal-http-client.port';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { UserStatus } from 'shared/domain/enums/user-status.enum';
import { RoommateProfileEntity } from './infrastructure/persistence/roommate-profile.entity';
import {
  SaveRoommateProfileRequest,
  SearchRoommateProfilesRequest,
} from './presentation/http/roommate-profile.request';

interface IdentityUser {
  id: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  isDeleted: boolean;
  avatarUrl: string | null;
}

// The same predicate is used for list and direct detail. Occupancy counts the
// lead once and every effective member except a member linked to that lead.
const ELIGIBLE = `p.is_visible = true AND p.is_deleted = false
  AND (
    NOT EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.is_deleted = false AND c.status = 'active'
        AND (c.tenant_id = p.tenant_id OR EXISTS (
          SELECT 1 FROM contract_members cm WHERE cm.contract_id = c.id
            AND cm.is_deleted = false AND cm.tenant_id = p.tenant_id
            AND cm.joined_at <= CURRENT_DATE
            AND (cm.left_at IS NULL OR cm.left_at > CURRENT_DATE)
        ))
    )
    OR EXISTS (
      SELECT 1 FROM contracts c
      JOIN rooms r ON r.id = c.room_id AND r.is_deleted = false
      WHERE c.is_deleted = false AND c.status = 'active'
        AND (c.tenant_id = p.tenant_id OR EXISTS (
          SELECT 1 FROM contract_members cm WHERE cm.contract_id = c.id
            AND cm.is_deleted = false AND cm.tenant_id = p.tenant_id
            AND cm.joined_at <= CURRENT_DATE
            AND (cm.left_at IS NULL OR cm.left_at > CURRENT_DATE)
        ))
        AND (r.max_occupancy IS NULL OR 1 + (
          SELECT COUNT(DISTINCT COALESCE(cm.tenant_id, cm.id)) FROM contract_members cm
          WHERE cm.contract_id = c.id AND cm.is_deleted = false
            AND cm.joined_at <= CURRENT_DATE
            AND (cm.left_at IS NULL OR cm.left_at > CURRENT_DATE)
            AND (c.tenant_id IS NULL OR cm.tenant_id IS DISTINCT FROM c.tenant_id)
        ) < r.max_occupancy)
    )
  )`;

@Injectable()
export class RoommateProfileService {
  constructor(
    @InjectRepository(RoommateProfileEntity)
    private readonly profiles: Repository<RoommateProfileEntity>,
    @Inject(INTERNAL_HTTP_DI_TOKEN.CLIENT)
    private readonly client: IInternalHttpClient,
  ) {}

  async save(tenantId: string, input: SaveRoommateProfileRequest) {
    await this.requireActiveTenant(tenantId);
    if (input.isVisible && !input.bio?.trim()) this.invalid();
    if (
      input.budgetMin != null &&
      input.budgetMax != null &&
      input.budgetMin > input.budgetMax
    )
      this.invalid();
    if (input.moveInOn && !this.validDate(input.moveInOn)) this.invalid();

    const existing = await this.profiles.findOneBy({ tenantId });
    const profile = existing ?? this.profiles.create({ tenantId });
    Object.assign(profile, {
      isVisible: input.isVisible,
      bio: input.bio?.trim() || null,
      gender: input.gender ?? null,
      birthYear: input.birthYear ?? null,
      occupation: input.occupation?.trim() || null,
      preferredProvince: input.preferredProvince?.trim() || null,
      preferredDistrict: input.preferredDistrict?.trim() || null,
      preferredArea: input.preferredArea?.trim() || null,
      budgetMin: input.budgetMin ?? null,
      budgetMax: input.budgetMax ?? null,
      moveInOn: input.moveInOn ?? null,
      lifestyle: input.lifestyle ?? null,
      isDeleted: false,
    });
    return this.ownView(await this.profiles.save(profile));
  }

  async mine(tenantId: string) {
    await this.requireActiveTenant(tenantId);
    const profile = await this.profiles.findOneBy({
      tenantId,
      isDeleted: false,
    });
    if (!profile) throw new NotFoundException();
    return this.ownView(profile);
  }

  async detail(viewerId: string, profileId: string) {
    await this.requireActiveTenant(viewerId);
    const profile = await this.profiles
      .createQueryBuilder('p')
      .where('p.id = :profileId', { profileId })
      .andWhere(ELIGIBLE)
      .getOne();
    if (!profile) throw new NotFoundException();
    const user = (await this.lookup([profile.tenantId])).get(
      profile.tenantId.toLowerCase(),
    );
    if (!user) throw new NotFoundException();
    return this.publicView(profile, user);
  }

  async search(viewerId: string, options: SearchRoommateProfilesRequest) {
    await this.requireActiveTenant(viewerId);
    const query = this.profiles
      .createQueryBuilder('p')
      .where(ELIGIBLE)
      .andWhere('p.tenant_id != :viewerId', { viewerId });
    if (options.filter?.preferredArea) {
      query.andWhere('p.preferred_area ILIKE :area', {
        area: `%${options.filter.preferredArea.replace(/[\\%_]/g, '\\$&')}%`,
      });
    }
    const candidates = await query
      .orderBy('p.created_at', 'DESC')
      .addOrderBy('p.id', 'ASC')
      .getMany();
    const users = await this.lookup(candidates.map((p) => p.tenantId));
    const eligible = candidates.filter((p) =>
      users.has(p.tenantId.toLowerCase()),
    );
    const start = (options.pageNo - 1) * options.pageSize;
    const data = eligible
      .slice(start, start + options.pageSize)
      .map((p) => this.publicView(p, users.get(p.tenantId.toLowerCase())!));
    const totalItems = eligible.length;
    return {
      data,
      pagination: {
        type: 'offset' as const,
        pageNo: options.pageNo,
        pageSize: options.pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / options.pageSize),
        hasNextPage: start + options.pageSize < totalItems,
        hasPreviousPage: options.pageNo > 1,
      },
    };
  }

  private publicView(profile: RoommateProfileEntity, user: IdentityUser) {
    return {
      id: profile.id,
      tenantId: profile.tenantId,
      tenantName: user.name,
      avatarUrl: user.avatarUrl,
      isVisible: true,
      bio: profile.bio,
      gender: profile.gender,
      birthYear: profile.birthYear,
      occupation: profile.occupation,
      preferredProvince: profile.preferredProvince,
      preferredDistrict: profile.preferredDistrict,
      preferredArea: profile.preferredArea,
      budgetMin: profile.budgetMin,
      budgetMax: profile.budgetMax,
      moveInOn: profile.moveInOn,
      lifestyle: profile.lifestyle,
    };
  }

  private ownView(profile: RoommateProfileEntity) {
    return {
      id: profile.id,
      tenantId: profile.tenantId,
      isVisible: profile.isVisible,
      bio: profile.bio,
      gender: profile.gender,
      birthYear: profile.birthYear,
      occupation: profile.occupation,
      preferredProvince: profile.preferredProvince,
      preferredDistrict: profile.preferredDistrict,
      preferredArea: profile.preferredArea,
      budgetMin: profile.budgetMin,
      budgetMax: profile.budgetMax,
      moveInOn: profile.moveInOn,
      lifestyle: profile.lifestyle,
    };
  }

  private async requireActiveTenant(id: string): Promise<void> {
    if (!(await this.lookup([id])).has(id.toLowerCase())) {
      throw new HttpException({ code: 'FORBIDDEN' }, HttpStatus.FORBIDDEN);
    }
  }

  private async lookup(ids: string[]): Promise<Map<string, IdentityUser>> {
    const found = new Map<string, IdentityUser>();
    const unique = [...new Set(ids.map((id) => id.toLowerCase()))];
    for (let i = 0; i < unique.length; i += 100) {
      const users = await this.client.get<IdentityUser[]>(
        PeerService.IDENTITY,
        '/internal/users',
        {
          query: { ids: unique.slice(i, i + 100).join(',') },
        },
      );
      for (const user of users) {
        if (
          !user.isDeleted &&
          user.role === UserRole.TENANT &&
          user.status === UserStatus.ACTIVE &&
          user.name?.trim()
        ) {
          found.set(user.id.toLowerCase(), user);
        }
      }
    }
    return found;
  }

  private validDate(value: string): boolean {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }

  private invalid(): never {
    throw new HttpException(
      { code: 'VALIDATION_FAILED' },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
