import type { AdministrativeProvince } from '../../domain/reference-data/administrative-province';
import type { AdministrativeWard } from '../../domain/reference-data/administrative-ward';

export interface AdministrativeUnitCatalogPort {
  listProvinces(): readonly AdministrativeProvince[];

  listWardsByProvince(provinceCode: string): readonly AdministrativeWard[];

  hasProvince(provinceCode: string): boolean;
}
