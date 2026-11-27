import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

it('returns 404 for the removed decision route with credentials accepted by the registered contract route', () => {
  // Native Node loads Nest 12 ESM; handler unit tests deliberately stub its decorators.
  const output = execFileSync(
    process.execPath,
    [
      '--require',
      'ts-node/register/transpile-only',
      '--require',
      'tsconfig-paths/register',
      resolve('test/support/contract-route-smoke.ts'),
    ],
    { encoding: 'utf8', timeout: 30000 },
  );
  expect(output).toContain(
    'Authenticated contract route 200; removed decision route 404',
  );
}, 35000);
