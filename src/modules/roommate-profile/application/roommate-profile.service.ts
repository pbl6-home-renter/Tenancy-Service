import { Inject, Injectable } from '@nestjs/common';
import {
  RoommateProfileDetails,
  RoommateProfileDetailsInput,
} from '../domain/value-objects/roommate-profile-details.vo';
import { RoommateProfileNotFoundException } from '../domain/exceptions/roommate-profile-not-found.exception';
import { RoommateTenantInactiveException } from '../domain/exceptions/roommate-tenant-inactive.exception';
import { RoommateProfileRecord } from '../domain/roommate-profile.types';
import { ROOMMATE_PROFILE_DI_TOKEN } from '../roommate-profile.di-token';
import { RoommateProfileRepository } from '../domain/repositories/roommate-profile.repository';
import { RoommateProfileReadPort } from './ports/roommate-profile-read.port';
import {
  TenantDirectoryPort,
  TenantSummary,
} from './ports/tenant-directory.port';
import {
  MyRoommateProfileResult,
  PublicRoommateProfileResult,
} from './roommate-profile.result';

export interface ProfileSearchOptions {
  pageNo: number;
  pageSize: number;
  preferredArea?: string;
}

@Injectable()
export class RoommateProfileService {
  constructor(
    @Inject(ROOMMATE_PROFILE_DI_TOKEN.REPOSITORY)
    private readonly profiles: RoommateProfileRepository,
    @Inject(ROOMMATE_PROFILE_DI_TOKEN.READ_REPOSITORY)
    private readonly reads: RoommateProfileReadPort,
    @Inject(ROOMMATE_PROFILE_DI_TOKEN.TENANT_DIRECTORY)
    private readonly tenants: TenantDirectoryPort,
  ) {}

  async save(tenantId: string, input: RoommateProfileDetailsInput) {
    await this.requireActiveTenant(tenantId);
    const details = RoommateProfileDetails.create(input);
    return this.ownView(await this.profiles.save(tenantId, details));
  }

  async mine(tenantId: string) {
    await this.requireActiveTenant(tenantId);
    const profile = await this.profiles.findOwn(tenantId);
    if (!profile) throw new RoommateProfileNotFoundException();
    return this.ownView(profile);
  }

  async detail(viewerId: string, profileId: string) {
    await this.requireActiveTenant(viewerId);
    const profile = await this.reads.findDiscoverable(profileId);
    if (!profile) throw new RoommateProfileNotFoundException();
    const user = (await this.tenants.findActive([profile.tenantId])).get(
      profile.tenantId.toLowerCase(),
    );
    if (!user) throw new RoommateProfileNotFoundException();
    return this.publicView(profile, user);
  }

  async search(viewerId: string, options: ProfileSearchOptions) {
    await this.requireActiveTenant(viewerId);
    const candidateIds = await this.reads.findCandidateTenantIds(
      viewerId,
      options.preferredArea,
    );
    const users = await this.tenants.findActive(candidateIds);
    const page = await this.reads.findPage(viewerId, [...users.keys()], {
      pageNo: options.pageNo,
      pageSize: options.pageSize,
      filter: { preferredArea: options.preferredArea },
    });
    const data = page.data.map((p) =>
      this.publicView(p, users.get(p.tenantId.toLowerCase())!),
    );
    return {
      data,
      pagination: page.pagination,
    };
  }

  private async requireActiveTenant(id: string): Promise<void> {
    if (!(await this.tenants.findActive([id])).has(id.toLowerCase())) {
      throw new RoommateTenantInactiveException();
    }
  }

  private publicView(
    profile: RoommateProfileRecord,
    user: TenantSummary,
  ): PublicRoommateProfileResult {
    return {
      ...this.ownView(profile),
      isVisible: true,
      tenantName: user.name,
      avatarUrl: user.avatarUrl,
    };
  }

  private ownView(profile: RoommateProfileRecord): MyRoommateProfileResult {
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
}
