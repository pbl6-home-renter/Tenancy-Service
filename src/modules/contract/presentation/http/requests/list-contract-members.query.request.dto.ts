import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsIn,
  IsObject,
  IsOptional,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { OffsetPaginationQueryRequestDto } from 'shared/presentation/pagination/offset-pagination.request.dto';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { ContractMemberListQuery } from '../../../application/queries/contract-member-list/contract-member-list.query';

export class ContractMemberListFilterRequestDto {
  @ApiProperty({ type: String, format: 'uuid' })
  @IsDefined({ message: 'CONTRACT_ID_REQUIRED' })
  @IsUuid()
  contractId: Uuid;
}

export class ListContractMembersQueryRequestDto extends OffsetPaginationQueryRequestDto<ContractMemberListFilterRequestDto> {
  static readonly unexpectedFieldCode = 'VALIDATION_FAILED';

  @ApiProperty({ type: ContractMemberListFilterRequestDto, required: true })
  // Override @IsOptional() inherited from the pagination DTO.
  @ValidateIf(() => true)
  @IsDefined({ message: 'CONTRACT_ID_REQUIRED' })
  @IsObject()
  @ValidateNested()
  @Type(() => ContractMemberListFilterRequestDto)
  declare filter: ContractMemberListFilterRequestDto;

  @ApiPropertyOptional({ enum: ['joinedAt'], default: 'joinedAt' })
  @IsOptional()
  @IsIn(['joinedAt'])
  override sort = 'joinedAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  override order: 'asc' | 'desc' = 'asc';

  @ApiPropertyOptional({ enum: ['json'], default: 'json' })
  @IsOptional()
  @IsIn(['json'])
  format = 'json';

  static toQuery(
    request: ListContractMembersQueryRequestDto,
    user: AuthenticatedUser,
  ): ContractMemberListQuery {
    return new ContractMemberListQuery(request.filter.contractId, user, {
      pageNo: request.pageNo,
      pageSize: request.pageSize,
      sort: request.sort,
      order: request.order,
    });
  }
}
