import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { PaginatedResponseDto } from 'shared/presentation/pagination/paginated.response.dto';
import { BuildingGetMineQuery } from '../../../application/queries/building-get-mine/building-get-mine.query';
import { BuildingListMineQuery } from '../../../application/queries/building-list-mine/building-list-mine.query';
import { BuildingEntity } from '../../../domain/entities/building.entity';
import { BuildingResponseCodeConstant } from '../constants/building-response-code.constant';
import {
  BuildingListMineQueryRequestDto,
  MyBuildingFilterRequestDto,
} from '../requests/building-list-mine.query.request.dto';
import { MyBuildingDetailResponseDto } from '../responses/my-building-detail.response.dto';
import { MyBuildingListResponseDto } from '../responses/my-building-list.response.dto';
import { Inject } from '@nestjs/common';
import {
  MEDIA_LOOKUP_PORT,
  MediaLookupPort,
} from 'modules/media/application/ports/media-lookup.port';

@ApiTags('Buildings')
@ApiBearerAuth()
@Controller('me/buildings')
export class MyBuildingController {
  constructor(
    private readonly queryBus: QueryBus,
    @Inject(MEDIA_LOOKUP_PORT) private readonly media: MediaLookupPort,
  ) {}

  @Get()
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.OK)
  @ResponseCode(BuildingResponseCodeConstant.BUILDINGS_MY_FETCHED)
  @ApiOperation({ operationId: 'getMeBuildings', summary: 'List my buildings' })
  @ApiQuery({
    name: 'filter',
    type: MyBuildingFilterRequestDto,
    required: false,
    style: 'deepObject',
    explode: true,
  })
  @ApiResponse({ status: HttpStatus.OK })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() request: BuildingListMineQueryRequestDto,
  ): Promise<PaginatedResponseDto<MyBuildingListResponseDto>> {
    const result = await this.queryBus.execute<
      BuildingListMineQuery,
      PaginatedResult<BuildingEntity>
    >(BuildingListMineQueryRequestDto.toQuery(request, user.id));
    return PaginatedResponseDto.create({
      data: result.data.map(MyBuildingListResponseDto.fromDomain),
      pagination: result.pagination,
    });
  }

  @Get(':buildingId')
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.OK)
  @ResponseCode(BuildingResponseCodeConstant.BUILDING_MY_FETCHED)
  @ApiOperation({
    operationId: 'getMeBuildingsBuildingid',
    summary: 'Get my building details',
  })
  @ApiSuccessResponse({
    code: BuildingResponseCodeConstant.BUILDING_MY_FETCHED,
    dataDto: MyBuildingDetailResponseDto,
  })
  async getById(
    @Param('buildingId', ParseUUIDPipe) buildingId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MyBuildingDetailResponseDto> {
    const building = await this.queryBus.execute<
      BuildingGetMineQuery,
      BuildingEntity
    >(new BuildingGetMineQuery(user.id, buildingId));
    const response = MyBuildingDetailResponseDto.fromDomain(building);
    const media = await this.media.findMediaByOwner('building', building.id);
    const certificates = media.filter(
      (item) =>
        item.purpose === 'ownership_proof' && item.status === 'uploaded',
    );
    response.ownershipCertificateMediaIds = certificates.map((item) => item.id);
    response.ownershipCertificateUrls = certificates.map(
      (item) => item.url ?? `/api/v1/media/${item.id}`,
    );
    return response;
  }
}
