import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { SaveRoommateProfileCommand } from '../../application/commands/save-roommate-profile/save-roommate-profile.command';
import { GetMyRoommateProfileQuery } from '../../application/queries/get-my-roommate-profile/get-my-roommate-profile.query';
import { GetRoommateProfileQuery } from '../../application/queries/get-roommate-profile/get-roommate-profile.query';
import { SearchRoommateProfilesQuery } from '../../application/queries/search-roommate-profiles/search-roommate-profiles.query';
import {
  SaveRoommateProfileRequest,
  SearchRoommateProfilesRequest,
} from './roommate-profile.request';

@ApiTags('Matching')
@ApiBearerAuth()
@Roles(UserRole.TENANT)
@Controller()
export class RoommateProfileController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Put('me/roommate-profile')
  @HttpCode(HttpStatus.OK)
  @ResponseCode('ROOMMATE_PROFILE_SAVED')
  save(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SaveRoommateProfileRequest,
  ) {
    return this.commandBus.execute(
      new SaveRoommateProfileCommand(user.id, body),
    );
  }

  @Get('me/roommate-profile')
  @ResponseCode('ROOMMATE_PROFILE_FETCHED')
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(new GetMyRoommateProfileQuery(user.id));
  }

  @Get('roommate-profiles')
  @ResponseCode('ROOMMATE_PROFILES_FETCHED')
  search(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchRoommateProfilesRequest,
  ) {
    return this.queryBus.execute(
      new SearchRoommateProfilesQuery(user.id, {
        pageNo: query.pageNo,
        pageSize: query.pageSize,
        preferredArea: query.filter?.preferredArea,
      }),
    );
  }

  @Get('roommate-profiles/:roommateProfileId')
  @ResponseCode('ROOMMATE_PROFILE_FETCHED')
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roommateProfileId', new ParseUUIDPipe()) id: string,
  ) {
    return this.queryBus.execute(new GetRoommateProfileQuery(user.id, id));
  }
}
