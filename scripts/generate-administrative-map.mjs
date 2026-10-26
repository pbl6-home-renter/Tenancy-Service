import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const source = 'https://provinces.open-api.vn/api/v2';
const output = resolve(
  'src/modules/administrative-unit/infrastructure/data/vietnam-administrative-units.v2.json',
);
const pad = (value, length) => String(value).padStart(length, '0');

const [provincesResponse, wardsResponse] = await Promise.all([
  fetch(`${source}/p/`),
  fetch(`${source}/w/`),
]);

if (!provincesResponse.ok || !wardsResponse.ok) {
  throw new Error(`Failed to download administrative units from ${source}`);
}

const [provinces, wards] = await Promise.all([
  provincesResponse.json(),
  wardsResponse.json(),
]);

const snapshot = {
  source,
  sourceVersion: 'v2',
  generatedAt: new Date().toISOString().slice(0, 10),
  provinces: provinces.map(({ code, name, division_type }) => ({
    code: pad(code, 2),
    name,
    divisionType: division_type,
  })),
  wards: wards.map(({ code, province_code, name, division_type }) => ({
    code: pad(code, 5),
    provinceCode: pad(province_code, 2),
    name,
    divisionType: division_type,
  })),
};

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(`Generated ${snapshot.provinces.length} provinces and ${snapshot.wards.length} wards.`);
