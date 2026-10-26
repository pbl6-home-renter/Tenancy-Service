import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosError, isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { ApiConfigService } from 'shared/infrastructure/config/api-config.service';
import { GeocodingFailedException } from '../../application/exceptions/geocoding-failed.exception';
import { GeocodingUnavailableException } from '../../application/exceptions/geocoding-unavailable.exception';
import {
  GeocodeAddressInput,
  GeocodedCoordinate,
  IGeocodingPort,
} from '../../application/ports/geocoding.port';

interface TrackAsiaSearchResponse {
  features?: Array<{
    geometry?: { coordinates?: unknown[] };
    properties?: { layer?: string; region?: string };
  }>;
}

const SEARCH_PATH = '/api/v1/search';

// Precise enough for a Building pin; coarser layers (ward, province) mean the
// street address itself was not found and TrackAsia fell back to an area centroid.
const PRECISE_LAYERS = new Set(['address', 'venue', 'street', 'neighbourhood']);

// Rough bounding box of Vietnam, including offshore islands.
const VIETNAM_BOUNDS = { minLat: 8, maxLat: 24, minLon: 102, maxLon: 110 };

@Injectable()
export class TrackAsiaGeocodingAdapter implements IGeocodingPort {
  private readonly logger = new Logger(TrackAsiaGeocodingAdapter.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ApiConfigService,
  ) {}

  async geocode(input: GeocodeAddressInput): Promise<GeocodedCoordinate> {
    const { apiKey, baseUrl, timeoutMs } = this.configService.geocoding;
    if (!apiKey) {
      throw new GeocodingUnavailableException('API key not configured');
    }

    const startedAt = Date.now();
    let body: TrackAsiaSearchResponse;
    try {
      const response = await firstValueFrom(
        this.httpService.get<TrackAsiaSearchResponse>(SEARCH_PATH, {
          baseURL: baseUrl,
          timeout: timeoutMs,
          params: {
            text: `${input.address}, ${input.ward}, ${input.province}, Vietnam`,
            lang: 'vi',
            new_admin: true,
            size: 1,
            key: apiKey,
          },
        }),
      );
      body = response.data;
    } catch (error) {
      throw this.toGeocodingException(error, Date.now() - startedAt);
    }

    const features = body.features ?? [];
    this.logger.debug(
      `TrackAsia search ${features.length} feature(s) (${Date.now() - startedAt}ms)`,
    );

    // TrackAsia always returns its best fuzzy match, even for nonsense input,
    // so only trust a precise result inside the province the landlord picked.
    const province = this.normalizeProvince(input.province);
    const feature = features.find(
      (candidate) =>
        PRECISE_LAYERS.has(candidate.properties?.layer ?? '') &&
        this.normalizeProvince(candidate.properties?.region ?? '') === province,
    );
    if (!feature) {
      throw new GeocodingFailedException('no precise result in province');
    }

    // GeoJSON order is [longitude, latitude].
    const [longitude, latitude] = feature.geometry?.coordinates ?? [];
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !this.isWithinVietnam(latitude, longitude)
    ) {
      throw new GeocodingFailedException('result outside Vietnam');
    }

    return {
      latitude: Number(latitude.toFixed(6)),
      longitude: Number(longitude.toFixed(6)),
    };
  }

  private toGeocodingException(error: unknown, elapsed: number): Error {
    if (!isAxiosError(error) || !error.response) {
      const reason = this.describeNetworkError(error);
      this.logger.warn(`TrackAsia search failed: ${reason} (${elapsed}ms)`);
      return new GeocodingUnavailableException(reason);
    }

    const { status } = error.response;
    this.logger.warn(`TrackAsia search failed: HTTP ${status} (${elapsed}ms)`);

    // Bad key or exhausted quota is a deployment problem, not the landlord's address.
    if (status >= 500 || status === 401 || status === 403 || status === 429) {
      return new GeocodingUnavailableException(`HTTP ${status}`);
    }
    return new GeocodingFailedException(`HTTP ${status}`);
  }

  private isWithinVietnam(latitude: number, longitude: number): boolean {
    return (
      latitude >= VIETNAM_BOUNDS.minLat &&
      latitude <= VIETNAM_BOUNDS.maxLat &&
      longitude >= VIETNAM_BOUNDS.minLon &&
      longitude <= VIETNAM_BOUNDS.maxLon
    );
  }

  private normalizeProvince(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase()
      .replace(/^(thanh pho|tinh)\s+/, '')
      .trim();
  }

  private describeNetworkError(error: unknown): string {
    if (isAxiosError(error)) {
      return error.code === AxiosError.ECONNABORTED ||
      error.code === AxiosError.ETIMEDOUT
        ? 'timeout'
        : (error.code ?? 'network error');
    }
    return error instanceof Error ? error.name : 'unknown error';
  }

}
