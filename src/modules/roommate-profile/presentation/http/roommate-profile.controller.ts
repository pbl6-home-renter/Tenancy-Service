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
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { RoommateProfileService } from '../../roommate-profile.service';
import {
  SaveRoommateProfileRequest,
  SearchRoommateProfilesRequest,
} from './roommate-profile.request';

@ApiTags('Matching')
@ApiBearerAuth()
@Roles(UserRole.TENANT)
@Controller()
export class RoommateProfileController {
  constructor(private readonly service: RoommateProfileService) {}

  @Put('me/roommate-profile')
  @HttpCode(HttpStatus.OK)
  @ResponseCode('ROOMMATE_PROFILE_SAVED')
  save(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SaveRoommateProfileRequest,
  ) {
    return this.service.save(user.id, body);
  }

  @Get('me/roommate-profile')
  @ResponseCode('ROOMMATE_PROFILE_FETCHED')
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.mine(user.id);
  }

  @Get('roommate-profiles')
  @ResponseCode('ROOMMATE_PROFILES_FETCHED')
  search(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchRoommateProfilesRequest,
  ) {
    return this.service.search(user.id, query);
  }

  @Get('roommate-profiles/:roommateProfileId')
  @ResponseCode('ROOMMATE_PROFILE_FETCHED')
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roommateProfileId', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.detail(user.id, id);
  }
}
