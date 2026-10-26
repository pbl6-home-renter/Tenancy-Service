import { Inject, Injectable } from '@nestjs/common';
import { ADMINISTRATIVE_UNIT_DI_TOKEN } from '../administrative-unit.di-token';
import { InvalidProvinceCodeException } from './exceptions/invalid-province-code.exception';
import { ProvinceNotFoundException } from './exceptions/province-not-found.exception';
import type { AdministrativeUnitCatalogPort } from './ports/administrative-unit-catalog.port';
import type { AdministrativeProvince } from '../domain/reference-data/administrative-province';
import type { AdministrativeWard } from '../domain/reference-data/administrative-ward';

@Injectable()
export class AdministrativeUnitService {
  constructor(
    @Inject(ADMINISTRATIVE_UNIT_DI_TOKEN.CATALOG)
    private readonly catalog: AdministrativeUnitCatalogPort,
  ) {}

  listProvinces(): readonly AdministrativeProvince[] {
    return this.catalog.listProvinces();
  }

  listWardsByProvince(rawProvinceCode: string): readonly AdministrativeWard[] {
    const provinceCode = this.normalizeProvinceCode(rawProvinceCode);
    if (!this.catalog.hasProvince(provinceCode)) {
      throw new ProvinceNotFoundException(provinceCode);
    }
    return this.catalog.listWardsByProvince(provinceCode);
  }

  private normalizeProvinceCode(rawProvinceCode: string): string {
    if (!/^\d{1,2}$/.test(rawProvinceCode)) {
      throw new InvalidProvinceCodeException();
    }
    return rawProvinceCode.padStart(2, '0');
  }
}
