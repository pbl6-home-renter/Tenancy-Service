import { DomainException } from 'shared/domain/exceptions/domain.exception';

/** The address could not be located; the landlord has to correct it. */
export class GeocodingFailedException extends DomainException {
  constructor(reason: string) {
    super(`Address could not be geocoded: ${reason}`, 422, 'GEOCODING_FAILED');
  }
}
