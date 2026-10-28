import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { OffsetPageInfo } from 'shared/application/pagination/offset-page-info';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { applySortingToQueryBuilder } from 'shared/infrastructure/database/pagination/sort.helper';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { BuildingStatus } from 'modules/building/domain/enums/building-status.enum';
import { BuildingTypeormEntity } from 'modules/building/infrastructure/persistence/building.typeorm-entity';
import type { PublicRoomFilter } from '../../application/queries/room-public-search/room-public-search.query';
import type { RoomPublicSearchResult } from '../../application/queries/room-public-search/room-public-search.result';
import type {
  RoomDetailAccessResult,
  RoomDetailResult,
} from '../../application/queries/room-get-detail/room-get-detail.result';
import { RoomTypeormEntity } from './room.typeorm-entity';

export interface RoomReadRepository {
  searchPublic(
    query: OffsetPageQuery<PublicRoomFilter>,
  ): Promise<PaginatedResult<RoomPublicSearchResult>>;
  findDetailAccessById(id: Uuid): Promise<RoomDetailAccessResult | null>;
  findDetailById(id: Uuid): Promise<RoomDetailResult | null>;
}

type PublicRoomRaw = Omit<RoomPublicSearchResult, 'area' | 'rentPrice'> & {
  area: string | number | null;
  rentPrice: string | number;
};

interface RoomDetailRaw extends PublicRoomRaw {
  buildingName: string | null;
  buildingStatus: BuildingStatus | null;
  buildingIsDeleted: boolean | null;
  landlordId: Uuid;
  description: string | null;
  floorNumber: number | null;
  depositAmount: string | number;
  status: RoomDetailResult['status'];
  maxOccupancy: number | null;
  amenities: RoomDetailResult['amenities'];
}

@Injectable()
export class TypeOrmRoomReadRepository implements RoomReadRepository {
  constructor(
    @InjectRepository(RoomTypeormEntity)
    private readonly roomRepository: Repository<RoomTypeormEntity>,
  ) {}

  async searchPublic(
    options: OffsetPageQuery<PublicRoomFilter>,
  ): Promise<PaginatedResult<RoomPublicSearchResult>> {
    const query = this.roomRepository
      .createQueryBuilder('room')
      .innerJoin(
        BuildingTypeormEntity,
        'building',
        'building.id = room.buildingId',
      )
      .select('room.id', 'id')
      .addSelect('room.buildingId', 'buildingId')
      .addSelect('room.name', 'name')
      .addSelect('room.area', 'area')
      .addSelect('room.rentPrice', 'rentPrice')
      .addSelect('room.genderPolicy', 'genderPolicy')
      .addSelect('building.address', 'address')
      .addSelect('building.province', 'province')
      .addSelect('building.ward', 'ward')
      .where('room.isDeleted = false')
      .andWhere('building.isDeleted = false')
      .andWhere('room.status = :roomStatus', { roomStatus: 'available' })
      .andWhere('building.status = :buildingStatus', {
        buildingStatus: BuildingStatus.APPROVED,
      });

    if (options.filter?.province !== undefined) {
      query.andWhere('building.province = :province', {
        province: options.filter.province,
      });
    }
    if (options.filter?.ward !== undefined) {
      query.andWhere('building.ward = :ward', {
        ward: options.filter.ward,
      });
    }
    if (options.filter?.minPrice !== undefined) {
      query.andWhere('room.rentPrice >= :minPrice', {
        minPrice: options.filter.minPrice,
      });
    }
    if (options.filter?.maxPrice !== undefined) {
      query.andWhere('room.rentPrice <= :maxPrice', {
        maxPrice: options.filter.maxPrice,
      });
    }
    if (options.filter?.genderPolicy !== undefined) {
      query.andWhere('room.genderPolicy = :genderPolicy', {
        genderPolicy: options.filter.genderPolicy,
      });
    }

    applySortingToQueryBuilder(query, options, {
      whitelist: ['rentPrice', 'createdAt', 'area'],
      defaultSort: 'rentPrice',
      defaultOrder: 'asc',
      alias: 'room',
    });

    const pageNo = options.pageNo > 0 ? options.pageNo : 1;
    const pageSize = options.pageSize > 0 ? options.pageSize : 20;
    const totalItems = await query.clone().getCount();
    const rows = await query
      .offset((pageNo - 1) * pageSize)
      .limit(pageSize)
      .getRawMany<PublicRoomRaw>();
    const totalPages = Math.ceil(totalItems / pageSize);
    const pagination: OffsetPageInfo = {
      type: 'offset',
      pageNo,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: pageNo < totalPages,
      hasPreviousPage: pageNo > 1,
    };

    return {
      data: rows.map((row) => ({
        ...row,
        area: row.area === null ? null : String(row.area),
        rentPrice: Number(row.rentPrice),
      })),
      pagination,
    };
  }

  async findDetailAccessById(id: Uuid): Promise<RoomDetailAccessResult | null> {
    const row = await this.roomRepository
      .createQueryBuilder('room')
      .leftJoin(
        BuildingTypeormEntity,
        'building',
        'building.id = room.buildingId',
      )
      .select('room.landlordId', 'landlordId')
      .addSelect('building.status', 'buildingStatus')
      .addSelect('building.isDeleted', 'buildingIsDeleted')
      .where('room.id = :id', { id })
      .andWhere('room.isDeleted = false')
      .getRawOne<RoomDetailAccessResult>();

    return row ?? null;
  }

  async findDetailById(id: Uuid): Promise<RoomDetailResult | null> {
    const row = await this.roomRepository
      .createQueryBuilder('room')
      .leftJoin(
        BuildingTypeormEntity,
        'building',
        'building.id = room.buildingId',
      )
      .select('room.id', 'id')
      .addSelect('room.buildingId', 'buildingId')
      .addSelect('building.name', 'buildingName')
      .addSelect('building.status', 'buildingStatus')
      .addSelect('building.isDeleted', 'buildingIsDeleted')
      .addSelect('room.landlordId', 'landlordId')
      .addSelect('room.name', 'name')
      .addSelect('room.description', 'description')
      .addSelect('room.area', 'area')
      .addSelect('room.floorNumber', 'floorNumber')
      .addSelect('room.rentPrice', 'rentPrice')
      .addSelect('room.depositAmount', 'depositAmount')
      .addSelect('room.status', 'status')
      .addSelect('room.maxOccupancy', 'maxOccupancy')
      .addSelect('room.genderPolicy', 'genderPolicy')
      .addSelect('room.amenities', 'amenities')
      .where('room.id = :id', { id })
      .andWhere('room.isDeleted = false')
      .getRawOne<RoomDetailRaw>();

    if (!row || row.buildingName === null) return null;

    return {
      ...row,
      buildingName: row.buildingName,
      area: row.area === null ? null : String(row.area),
      rentPrice: Number(row.rentPrice),
      depositAmount: Number(row.depositAmount),
    };
  }
}
