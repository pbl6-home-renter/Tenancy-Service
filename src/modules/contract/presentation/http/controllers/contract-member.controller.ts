import { UserAvatarLookupQuery } from '../../../application/queries/user-avatar-lookup/user-avatar-lookup.query';
import { UserAvatarUrls } from '../../../application/queries/user-avatar-lookup/user-avatar-lookup.query.handler';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { PaginatedResponseDto } from 'shared/presentation/pagination/paginated.response.dto';
import { ContractMemberAddCommand } from '../../../application/commands/contract-member-add/contract-member-add.command';
import { ContractMemberUpdateCommand } from '../../../application/commands/contract-member-update/contract-member-update.command';
import { ContractMemberLeaveCommand } from '../../../application/commands/contract-member-leave/contract-member-leave.command';
import { ContractMemberListQuery } from '../../../application/queries/contract-member-list/contract-member-list.query';
import { ContractMember } from '../../../domain/entities/contract-member.entity';
import { ContractMemberResponseCodeConstant as Code } from '../constants/contract-member-response-code.constant';
import { AddContractMemberRequest } from '../requests/add-contract-member.request';
import { UpdateContractMemberRequest } from '../requests/update-contract-member.request';
import { LeaveContractMemberRequest } from '../requests/leave-contract-member.request';
import { ListContractMembersQueryRequestDto } from '../requests/list-contract-members.query.request.dto';
import { ContractMemberListItemResponseDto } from '../responses/contract-member-list-item.response.dto';
import { ContractMemberAddResponseDto } from '../responses/contract-member-add.response.dto';
import { ContractMemberUpdateResponseDto } from '../responses/contract-member-update.response.dto';
import { ContractMemberLeaveResponseDto } from '../responses/contract-member-leave.response.dto';

@ApiTags('ContractMember')
@ApiBearerAuth()
@Controller('contract-members')
export class ContractMemberController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.CREATED)
  @ResponseCode(Code.CONTRACT_MEMBER_ADDED)
  @ApiOperation({
    operationId: 'postContractMembers',
    summary: 'Add contract member',
  })
  @ApiSuccessResponse({
    status: HttpStatus.CREATED,
    code: Code.CONTRACT_MEMBER_ADDED,
    dataDto: ContractMemberAddResponseDto,
  })
  async add(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: AddContractMemberRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ContractMemberAddResponseDto> {
    const member = await this.commandBus.execute<
      ContractMemberAddCommand,
      ContractMember
    >(AddContractMemberRequest.toCommand(request, user.id));
    response.setHeader('Location', `/api/v1/contract-members/${member.id}`);
    return ContractMemberAddResponseDto.fromDomain(member);
  }

  @Get()
  @Roles(UserRole.LANDLORD, UserRole.TENANT)
  @HttpCode(HttpStatus.OK)
  @ResponseCode(Code.CONTRACT_MEMBERS_FETCHED)
  @ApiOperation({
    operationId: 'getContractMembers',
    summary: 'List contract members',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() request: ListContractMembersQueryRequestDto,
  ): Promise<PaginatedResponseDto<ContractMemberListItemResponseDto>> {
    const result = await this.queryBus.execute<
      ContractMemberListQuery,
      PaginatedResult<ContractMember>
    >(ListContractMembersQueryRequestDto.toQuery(request, user));
    const avatars = await this.queryBus.execute<
      UserAvatarLookupQuery,
      UserAvatarUrls
    >(new UserAvatarLookupQuery(result.data.map((member) => member.tenantId)));
    return PaginatedResponseDto.create({
      data: result.data.map((member) =>
        ContractMemberListItemResponseDto.fromDomain(member, avatars),
      ),
      pagination: result.pagination,
    });
  }

  @Patch(':tenantId')
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.OK)
  @ResponseCode(Code.CONTRACT_MEMBER_UPDATED)
  @ApiOperation({
    operationId: 'patchContractMembersTenantid',
    summary: 'Update member phone',
  })
  @ApiParam({
    name: 'tenantId',
    type: String,
    format: 'uuid',
    description: 'Tenant user ID or contract member ID',
  })
  @ApiSuccessResponse({
    code: Code.CONTRACT_MEMBER_UPDATED,
    dataDto: ContractMemberUpdateResponseDto,
  })
  async update(
    @Param('tenantId', ParseUUIDPipe) tenantId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: UpdateContractMemberRequest,
  ): Promise<ContractMemberUpdateResponseDto> {
    const member = await this.commandBus.execute<
      ContractMemberUpdateCommand,
      ContractMember
    >(UpdateContractMemberRequest.toCommand(request, tenantId, user.id));
    return ContractMemberUpdateResponseDto.fromDomain(member);
  }

  @Post(':tenantId/leave-contract')
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.OK)
  @ResponseCode(Code.CONTRACT_MEMBER_LEFT)
  @ApiOperation({
    operationId: 'postContractMembersTenantidLeaveContract',
    summary: 'Record member leave date',
  })
  @ApiParam({ name: 'tenantId', type: String, format: 'uuid' })
  @ApiSuccessResponse({
    code: Code.CONTRACT_MEMBER_LEFT,
    dataDto: ContractMemberLeaveResponseDto,
  })
  async leave(
    @Param('tenantId', ParseUUIDPipe) tenantId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: LeaveContractMemberRequest,
  ): Promise<ContractMemberLeaveResponseDto> {
    const member = await this.commandBus.execute<
      ContractMemberLeaveCommand,
      ContractMember
    >(LeaveContractMemberRequest.toCommand(request, tenantId, user.id));
    return ContractMemberLeaveResponseDto.fromDomain(member);
  }
}
