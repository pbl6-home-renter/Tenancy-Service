require('reflect-metadata');
require('tsconfig-paths/register');

const assert = require('node:assert/strict');
const test = require('node:test');
const { Reflector } = require('@nestjs/core');
const { UserRole } = require('../../dist/shared/domain/enums/user-role.enum');
const {
  UserStatus,
} = require('../../dist/shared/domain/enums/user-status.enum');
const {
  ActiveUserGuard,
} = require('../../dist/shared/presentation/guards/active-user.guard');
const {
  RolesGuard,
} = require('../../dist/shared/presentation/guards/roles.guard');
const {
  MyBuildingController,
} = require('../../dist/modules/building/presentation/http/controllers/my-building.controller');
const {
  RoomController,
} = require('../../dist/modules/room/presentation/http/controllers/room.controller');
const {
  RoomHubController,
} = require('../../dist/modules/contract/presentation/http/controllers/room-hub.controller');
const {
  ContractMyController,
} = require('../../dist/modules/contract/presentation/http/controllers/contract-my.controller');
const {
  ContractController,
} = require('../../dist/modules/contract/presentation/http/controllers/contract.controller');
const {
  ContractMemberController,
} = require('../../dist/modules/contract/presentation/http/controllers/contract-member.controller');
const {
  InvoiceMyController,
} = require('../../dist/modules/invoice/presentation/http/controllers/invoice-my.controller');
const {
  InvoiceController,
} = require('../../dist/modules/invoice/presentation/http/controllers/invoice.controller');

const reflector = new Reflector();
const rolesGuard = new RolesGuard(reflector);
const activeUserGuard = new ActiveUserGuard(reflector);

function context(controller, method, role) {
  return {
    getType: () => 'http',
    getClass: () => controller,
    getHandler: () => controller.prototype[method],
    switchToHttp: () => ({
      getRequest: () => ({ user: { role, status: UserStatus.LOCKED } }),
    }),
  };
}

function responseCode(error) {
  return error.getResponse().code;
}

const readRoutes = [
  [MyBuildingController, 'list', UserRole.LANDLORD],
  [MyBuildingController, 'getById', UserRole.LANDLORD],
  [RoomController, 'getMyRooms', UserRole.LANDLORD],
  [RoomHubController, 'list', UserRole.TENANT],
  [ContractMyController, 'list', UserRole.TENANT],
  [ContractController, 'list', UserRole.LANDLORD],
  [ContractController, 'getById', UserRole.LANDLORD],
  [ContractController, 'getById', UserRole.TENANT],
  [ContractMemberController, 'list', UserRole.LANDLORD],
  [ContractMemberController, 'list', UserRole.TENANT],
  [InvoiceMyController, 'list', UserRole.TENANT],
  [InvoiceController, 'list', UserRole.LANDLORD],
  [InvoiceController, 'detail', UserRole.LANDLORD],
  [InvoiceController, 'detail', UserRole.TENANT],
];

test('locked accounts can call only the listed read routes for their role', () => {
  for (const [controller, method, role] of readRoutes) {
    const route = context(controller, method, role);
    assert.equal(rolesGuard.canActivate(route), true);
    assert.equal(activeUserGuard.canActivate(route), true);
  }
});

test('a locked tenant cannot use landlord read routes', () => {
  const route = context(MyBuildingController, 'getById', UserRole.TENANT);
  assert.throws(
    () => rolesGuard.canActivate(route),
    (error) => {
      assert.equal(responseCode(error), 'FORBIDDEN');
      return true;
    },
  );
  assert.throws(
    () => activeUserGuard.canActivate(route),
    (error) => {
      assert.equal(responseCode(error), 'ACCOUNT_LOCKED');
      return true;
    },
  );
});

test('locked accounts remain blocked from writes on the same controllers', () => {
  for (const [controller, method, role] of [
    [RoomController, 'create', UserRole.LANDLORD],
    [ContractController, 'create', UserRole.LANDLORD],
    [ContractMemberController, 'add', UserRole.LANDLORD],
    [InvoiceController, 'generate', UserRole.LANDLORD],
  ]) {
    const route = context(controller, method, role);
    assert.equal(rolesGuard.canActivate(route), true);
    assert.throws(
      () => activeUserGuard.canActivate(route),
      (error) => {
        assert.equal(responseCode(error), 'ACCOUNT_LOCKED');
        return true;
      },
    );
  }
});
