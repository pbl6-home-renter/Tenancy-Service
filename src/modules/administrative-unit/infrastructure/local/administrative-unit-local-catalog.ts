import { Injectable } from '@nestjs/common';
import catalog from '../data/vietnam-administrative-units.v2.json';
import type { AdministrativeProvince } from '../../domain/reference-data/administrative-province';
import type { AdministrativeWard } from '../../domain/reference-data/administrative-ward';
import type { AdministrativeUnitSnapshot } from '../data/administrative-unit-snapshot';
import type { AdministrativeUnitCatalogPort } from '../../application/ports/administrative-unit-catalog.port';

@Injectable()
export class AdministrativeUnitLocalCatalog implements AdministrativeUnitCatalogPort {
  private readonly data = catalog as AdministrativeUnitSnapshot;

  listProvinces(): readonly AdministrativeProvince[] {
    return this.data.provinces;
  }

  listWardsByProvince(provinceCode: string): readonly AdministrativeWard[] {
    return this.data.wards.filter((ward) => ward.provinceCode === provinceCode);
  }

  hasProvince(provinceCode: string): boolean {
    return this.data.provinces.some(
      (province) => province.code === provinceCode,
    );
  }
}
