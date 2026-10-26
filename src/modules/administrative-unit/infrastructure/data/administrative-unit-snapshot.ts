import type { AdministrativeProvince } from '../../domain/reference-data/administrative-province';
import type { AdministrativeWard } from '../../domain/reference-data/administrative-ward';

export interface AdministrativeUnitSnapshot {
  provinces: readonly AdministrativeProvince[];

  wards: readonly AdministrativeWard[];
}
