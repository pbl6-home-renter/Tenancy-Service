<div align="center">

<h1>Rentify · Tenancy Service</h1>

<p>Service quản lý tòa nhà, phòng trọ và đơn vị hành chính Việt Nam của nền tảng Rentify.</p>

<p>
  <a href="https://github.com/pbl6-home-renter/Tenancy-Service/actions/workflows/deploy.yml"><img alt="Deploy" src="https://github.com/pbl6-home-renter/Tenancy-Service/actions/workflows/deploy.yml/badge.svg"></a>
  <a href="https://github.com/pbl6-home-renter/Tenancy-Service/actions/workflows/db-keepalive.yml"><img alt="DB Keepalive" src="https://github.com/pbl6-home-renter/Tenancy-Service/actions/workflows/db-keepalive.yml/badge.svg"></a>
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-24.18-339933?style=flat-square&logo=nodedotjs&logoColor=white">
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-12-E0234E?style=flat-square&logo=nestjs&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white">
  <img alt="TypeORM" src="https://img.shields.io/badge/TypeORM-1.1-FE0803?style=flat-square&logo=typeorm&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=flat-square&logo=postgresql&logoColor=white">
  <img alt="RabbitMQ" src="https://img.shields.io/badge/RabbitMQ-topic_exchange-FF6600?style=flat-square&logo=rabbitmq&logoColor=white">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-linux%2Famd64-2496ED?style=flat-square&logo=docker&logoColor=white">
</p>

<p>
  <a href="#giới-thiệu">Giới thiệu</a> •
  <a href="#bắt-đầu-nhanh">Bắt đầu nhanh</a> •
  <a href="#biến-môi-trường">Biến môi trường</a> •
  <a href="#kiến-trúc">Kiến trúc</a> •
  <a href="#api--tài-liệu">API</a> •
  <a href="#triển-khai">Triển khai</a> •
  <a href="#đóng-góp">Đóng góp</a>
</p>

</div>

## Giới thiệu

**Tenancy Service** là bounded context "nhà trọ" của Rentify: chủ trọ đăng ký tòa nhà (được geocode qua TrackAsia và chờ admin duyệt), tạo và quản lý phòng trong tòa nhà đã duyệt; người dùng (kể cả khách chưa đăng nhập) tìm kiếm tòa nhà/phòng công khai; client tra cứu danh mục tỉnh/phường Việt Nam theo đơn vị hành chính mới.

Service được fork từ [`boilerplate`](https://github.com/pbl6-home-renter/boilerplate) nên dùng chung kiến trúc **Clean Architecture + DDD + CQRS**, Transactional Outbox/Inbox với RabbitMQ và internal HTTP client để đọc dữ liệu từ service khác. Chạy ở cổng **3002**, nằm sau [`api-gateway`](https://github.com/pbl6-home-renter/api-gateway) với path segment `tenancy` (`ServiceConstants.PATH`).

## Tính năng nổi bật

- **Tòa nhà (Building)** — chủ trọ tạo/sửa/xóa mềm tòa nhà; địa chỉ được geocode bằng TrackAsia (chỉ chấp nhận kết quả đủ chính xác, nằm trong lãnh thổ Việt Nam). Vòng đời `pending → approved | rejected`, admin duyệt/từ chối kèm ghi chú; tòa nhà đã duyệt bị khóa chỉnh sửa.
- **Phòng (Room)** — chỉ tạo được trong tòa nhà đã duyệt; giá thuê, tiền cọc, diện tích, tầng, tiện ích, sức chứa, chính sách giới tính (`any | male | female`). Trạng thái `available | occupied | maintenance`, có thao tác `mark-ready` (`maintenance → available`).
- **Tìm kiếm công khai** — lọc tòa nhà theo tỉnh/phường/từ khóa; lọc phòng theo tỉnh/phường/khoảng giá/chính sách giới tính, có phân trang.
- **Đơn vị hành chính** — danh mục tỉnh và phường (dữ liệu v2 từ `provinces.open-api.vn`) được đóng gói sẵn dạng JSON snapshot, phục vụ cục bộ, không phụ thuộc mạng lúc runtime.
- **Hợp đồng (Contract)** — đã có domain + persistence (bảng `contracts`, trạng thái `draft | signed | active | suspended | expired | terminated`); chưa expose HTTP endpoint.
- **Sự kiện tin cậy** — mọi thay đổi aggregate ghi kèm `outbox_messages` trong cùng transaction, relay publish lên RabbitMQ topic exchange (at-least-once, retry + DLQ).
- **Bảo mật** — tự verify JWT RS256 của Identity-Service qua JWKS cache; phân quyền `LANDLORD` / `ADMIN`, kiểm tra quyền sở hữu trong use case.

## Tech stack

| Thành phần | Công nghệ |
|---|---|
| Runtime | Node.js `>=24.18.0` (`.nvmrc`: `v24.18.0`) |
| Framework | NestJS 12, `@nestjs/cqrs` |
| Ngôn ngữ | TypeScript 6 |
| Cơ sở dữ liệu | PostgreSQL (Supabase), TypeORM 1.1, `typeorm-extension` |
| Message broker | RabbitMQ qua `@golevelup/nestjs-rabbitmq` (publisher confirm) |
| Xác thực | JWT RS256 + JWKS (`jose`) |
| Geocoding | TrackAsia Search API (`@nestjs/axios`) |
| Tài liệu API | Swagger (`@nestjs/swagger`) |
| Chất lượng code | oxlint, Prettier, Husky + lint-staged |
| Đóng gói | Docker multi-stage (`node:24.18.0-slim`) |

## Bắt đầu nhanh

### Yêu cầu

- Node.js `24.18.0` và npm
- PostgreSQL (khuyến nghị Supabase) và RabbitMQ đang chạy
- Identity-Service đang chạy (cung cấp JWKS để verify token, và `internal/users` cho màn hình admin)
- TrackAsia API key nếu cần tạo/sửa địa chỉ tòa nhà

### Cài đặt

```bash
git clone https://github.com/pbl6-home-renter/Tenancy-Service.git
cd Tenancy-Service
npm install
```

### Cấu hình

```bash
cp .env.example .env
# Điền DATABASE_URL, MIGRATION_DATABASE_URL, RABBITMQ_URL, TRACKASIA_API_KEY, SERVICE_TOKEN
```

### Chạy

```bash
npm run migration:run    # tạo bảng outbox/inbox, buildings, rooms, contracts
npm run start:dev        # watch mode
```

- API: `http://localhost:3002/api/v1/...`
- Health: `GET http://localhost:3002/api/v1/tenancy/health`
- Swagger: `http://localhost:3002/api/v1/tenancy/swagger` (khi `ENABLE_DOCUMENTATION=true`)

<details>
<summary>Chạy bằng Docker</summary>

```bash
docker build -t tenancy-service:local .
docker run -p 3002:3002 --env-file .env tenancy-service:local
```

Container chạy `start.sh`: `migration:run:prod` rồi `node dist/main.js`.

</details>

> [!IMPORTANT]
> Mặc định cổng trong code và `ARG PORT` của Dockerfile là `3001` (kế thừa từ boilerplate). Luôn đặt `PORT=3002` trong `.env` để không xung đột với Identity-Service.

## Biến môi trường

Toàn bộ biến lấy từ [`.env.example`](.env.example) và được validate bởi `ApiConfigService`.

| Biến | Bắt buộc | Mô tả |
|---|:---:|---|
| **Ứng dụng** | | |
| `APP_NAME` | Không | Tên ứng dụng (`tenancy-service`) |
| `PORT` | Có | Cổng HTTP — `3002` |
| `NODE_ENV` | Có | `development` / `production` / `test` |
| `API_DOMAIN`, `API_VERSION` | Không | Thông tin hiển thị trên Swagger (`localhost`, `1.0.0`) |
| `ENABLE_DOCUMENTATION` | Không | Bật Swagger UI (`true`) |
| `LOG_LEVEL` | Không | `debug` / `info` / `warn` / `error` |
| **Xác thực** | | |
| `JWKS_URL` | Có | JWKS của Identity-Service, vd. `http://localhost:3001/api/v1/.well-known/jwks.json` |
| `JWT_ISSUER` | Có | Phải khớp Identity-Service (`rentify-identity`) |
| `JWT_AUDIENCE` | Có | Phải khớp Identity-Service (`rentify-api`) |
| `SERVICE_TOKEN` | Có (production) | Secret dùng chung cho route `internal/*` và header `X-Service-Token` khi gọi peer; để trống = tắt |
| **Peer services** | | |
| `IDENTITY_SERVICE_URL` | Có | URL nội bộ Identity-Service (`http://identity:3001`); trống = lời gọi trả `503` |
| `INTERNAL_HTTP_TIMEOUT_MS` | Không | Timeout gọi peer (`3000`) |
| **Geocoding** | | |
| `TRACKASIA_API_KEY` | Có (để tạo building) | Key TrackAsia, chỉ nằm ở backend; trống = tạo building trả `503` |
| `TRACKASIA_BASE_URL` | Không | `https://maps.track-asia.com` |
| `TRACKASIA_TIMEOUT_MS` | Không | `3000` |
| **Cơ sở dữ liệu** | | |
| `DATABASE_URL` | Có | Connection string PostgreSQL (Supabase pooler) |
| `MIGRATION_DATABASE_URL` | Không | Direct URL (không qua pgbouncer) dùng cho migration |
| **RabbitMQ** | | |
| `RABBITMQ_URL` | Có | `amqp://user:password@localhost:5672` |
| `RABBITMQ_DEFAULT_USER`, `RABBITMQ_DEFAULT_PASS` | Không | Tài khoản broker |
| `RABBITMQ_EXCHANGE` / `RABBITMQ_EXCHANGE_TYPE` | Không | `pbl6.events` / `topic` |
| `RABBITMQ_PREFETCH` | Không | `10` (consumer queue dùng prefetch 1 để giữ thứ tự) |
| `RABBITMQ_CONNECT_TIMEOUT_MS` | Không | `10000` |
| `RABBITMQ_PUBLISH_MANDATORY` | Không | `true` |
| `RABBITMQ_CONSUMER_MAX_ATTEMPTS` | Không | Số lần xử lý trước khi chuyển vào `<queue>.dlq` (`5`) |
| `RABBITMQ_CONSUMER_RETRY_DELAY_MS` | Không | Thời gian chờ ở `<queue>.retry` (`10000`) |
| **Transactional Outbox** | | |
| `OUTBOX_RELAY_ENABLED` | Không | Bật/tắt relay (`true`) |
| `OUTBOX_RELAY_INTERVAL_MS` / `OUTBOX_RELAY_BATCH_SIZE` | Không | Chu kỳ poll / số message mỗi lượt (`1000` / `100`) |
| `OUTBOX_PUBLISH_TIMEOUT_MS` / `OUTBOX_CLAIM_TIMEOUT_MS` | Không | `5000` / `60000` |
| `OUTBOX_MAX_ATTEMPTS` | Không | Số lần publish trước khi chuyển `FAILED` (`10`) |
| `OUTBOX_RETRY_BASE_DELAY_MS` / `OUTBOX_RETRY_MAX_DELAY_MS` | Không | Backoff (`1000` / `60000`) |
| `OUTBOX_RETENTION_MS` | Không | Thời gian giữ row `PUBLISHED` (`604800000` = 7 ngày) |

> [!WARNING]
> Không commit file `.env`. Các secret (`DATABASE_URL`, `SERVICE_TOKEN`, `TRACKASIA_API_KEY`) chỉ đặt ở `.env` local hoặc trên host deploy.

## Scripts

| Lệnh | Mô tả |
|---|---|
| `npm run start:dev` | Chạy dev (watch mode) |
| `npm run start:debug` | Dev + debugger |
| `npm run build` / `npm run start:prod` | Build ra `dist/` / chạy bản build |
| `npm run lint` / `npm run lint:fix` | oxlint trên `src/` |
| `npm run format` / `npm run format:check` | Prettier |
| `npm run migration:generate -- src/database/migrations/<Name>` | Sinh migration từ thay đổi entity |
| `npm run migration:create -- src/database/migrations/<Name>` | Tạo migration rỗng |
| `npm run migration:run` / `npm run migration:revert` | Áp dụng / hoàn tác migration |
| `npm run migration:run:prod` | Chạy migration từ `dist/` (dùng trong container) |
| `npm run seed:run` | Chạy seeder (`typeorm-extension`) |
| `npm run outbox:requeue -- <message-id>` | Đưa message outbox `FAILED` về hàng đợi publish |
| `npm run administrative-map:generate` | Tải lại snapshot tỉnh/phường từ `provinces.open-api.vn` (API v2) |

> [!NOTE]
> Service chưa có test script; kiểm tra bằng `npm run build`, `npm run lint` và lệnh kiểm tra dependency rule trong [`docs/architecture.md`](docs/architecture.md) §7.

## Cấu trúc thư mục

```text
Tenancy-Service/
├── .github/workflows/
│   ├── deploy.yml                 # Build image linux/amd64 → Docker Hub → deploy EC2 (internal stack)
│   └── db-keepalive.yml           # Cron giữ Supabase không ngủ
├── docs/                          # Kiến trúc & thiết kế outbox (kế thừa boilerplate)
├── scripts/
│   ├── generate-administrative-map.mjs  # Sinh snapshot đơn vị hành chính
│   └── keep-alive.ts                    # Dùng bởi db-keepalive.yml
├── src/
│   ├── main.ts                    # Bootstrap: prefix api/v1 (trừ internal/*), Swagger, validation
│   ├── app.module.ts
│   ├── config/service.constants.ts  # PATH=tenancy, TITLE, DEFAULT_DATABASE_NAME=tenancy_db
│   ├── database/migrations/       # Outbox/inbox, buildings, rooms, contracts
│   ├── shared/                    # Shared kernel — đồng bộ từ boilerplate, KHÔNG sửa tại đây
│   └── modules/
│       ├── administrative-unit/   # Danh mục tỉnh/phường (JSON snapshot, catalog cục bộ)
│       ├── building/              # Aggregate Building, geocoding TrackAsia, duyệt admin
│       ├── room/                  # Aggregate Room, tìm kiếm công khai, phòng của chủ trọ
│       ├── contract/              # Aggregate Contract (domain + persistence)
│       ├── outbox/                # Transactional outbox + relay + CLI requeue
│       ├── inbox/                 # Dedup phía consumer (processed_events)
│       └── health/                # GET /api/v1/tenancy/health
├── Dockerfile                     # Multi-stage build
├── start.sh                       # Entrypoint: migrate rồi start
└── .env.example
```

Mỗi module nghiệp vụ theo layout `domain/` → `application/` (`commands/<noun>-<verb>/`, `queries/<noun>-<verb>/`) ← `infrastructure/` + `presentation/http/`, port được bind bằng Symbol DI token trong `<module>.di-token.ts`.

## Kiến trúc

### Tổng quan

```mermaid
flowchart LR
    client["Web / Mobile"] --> gw["api-gateway :3000"]
    gw -->|"/buildings, /rooms, /me/*, /admin/buildings, /administrative-units"| ten["Tenancy Service :3002"]
    ten -->|"JWKS (cache)"| idp["Identity-Service :3001"]
    ten -->|"GET internal/users (X-Service-Token)"| idp
    ten -->|"geocode địa chỉ"| ta["TrackAsia API"]
    ten --> db[("PostgreSQL tenancy_db")]
    db -->|"outbox relay"| mq{{"RabbitMQ pbl6.events"}}
```

Dependency một chiều: `presentation`/`infrastructure` → `application` → `domain`; domain không import NestJS/TypeORM. Chi tiết: [`docs/architecture.md`](docs/architecture.md).

### Mô hình domain

```mermaid
erDiagram
    BUILDING ||--o{ ROOM : "chứa"
    ROOM ||--o{ CONTRACT : "cho thuê theo"
    BUILDING {
        uuid id
        uuid landlordId
        string name
        string province
        string ward
        string address
        float latitude
        float longitude
        enum status "pending | approved | rejected"
        string note
    }
    ROOM {
        uuid id
        uuid buildingId
        uuid landlordId
        string name
        int floorNumber
        float area
        int rentPrice
        int depositAmount
        int maxOccupancy
        enum genderPolicy "any | male | female"
        enum status "available | occupied | maintenance"
    }
    CONTRACT {
        uuid id
        uuid roomId
        uuid landlordId
        uuid tenantId
        date startDate
        date endDate
        enum status "draft | signed | active | suspended | expired | terminated"
    }
```

Building, Room, Contract đều xóa mềm (`isDeleted`). Đơn vị hành chính (tỉnh/phường) là dữ liệu tham chiếu chỉ đọc, không lưu trong database.

### Sự kiện và lời gọi nội bộ

| Hướng | Chi tiết |
|---|---|
| Publish (outbox → RabbitMQ) | `building.created`, `building.updated`, `building.approved`, `building.rejected`, `building.deleted` |
| | `room.created`, `room.updated`, `room.deleted`, `room.status_changed` |
| | `contract.created`, `contract.updated`, `contract.activated` (domain đã định nghĩa, chưa có use case HTTP) |
| Consume | Chưa có subscriber; module `inbox` sẵn sàng cho consumer tương lai |
| Internal HTTP (GET) | `Identity-Service` `GET /internal/users?ids=...` — lấy tên/SĐT/email chủ trọ cho màn hình admin; Identity không phản hồi thì trả dữ liệu thiếu thông tin liên hệ thay vì lỗi |
| External HTTP | TrackAsia `GET /api/v1/search` khi tạo/sửa địa chỉ building |

Outbox đảm bảo at-least-once; thứ tự chỉ cam kết trong cùng aggregate. Xem [`docs/transactional-outbox-design.md`](docs/transactional-outbox-design.md).

### Xác thực

Guard toàn cục theo thứ tự `ServiceTokenGuard` → `JwtAuthGuard` → `RolesGuard` → `ActiveUserGuard`; mọi route cần token trừ khi có `@Public()`. Service tự verify JWT, **không** tin header `x-user-*`. Quyền sở hữu (landlord chỉ thao tác building/room của mình) được kiểm tra trong use case. Service không bật CORS — gateway đảm nhiệm.

## API / Tài liệu

Mọi đường dẫn dưới prefix `/api/v1`.

| Method | Path | Quyền | Mục đích |
|---|---|---|---|
| `GET` | `/tenancy/health` | Public | Health check |
| `GET` | `/administrative-units/provinces` | Public | Danh sách tỉnh/thành |
| `GET` | `/administrative-units/provinces/:provinceCode/wards` | Public | Danh sách phường của một tỉnh |
| `GET` | `/buildings` | Public | Tìm tòa nhà đã duyệt (`province`, `ward`, `q`, phân trang) |
| `GET` | `/buildings/:buildingId` | Public | Chi tiết tòa nhà công khai |
| `POST` | `/buildings` | `LANDLORD` | Tạo tòa nhà (geocode, trạng thái `pending`) |
| `PATCH` | `/buildings/:buildingId` | `LANDLORD` | Cập nhật tòa nhà chưa duyệt |
| `DELETE` | `/buildings/:buildingId` | `LANDLORD` | Xóa mềm tòa nhà |
| `POST` | `/buildings/:buildingId/approve` | `ADMIN` | Duyệt tòa nhà |
| `POST` | `/buildings/:buildingId/reject` | `ADMIN` | Từ chối tòa nhà (kèm ghi chú) |
| `GET` | `/me/buildings` | `LANDLORD` | Danh sách tòa nhà của tôi |
| `GET` | `/me/buildings/:buildingId` | `LANDLORD` | Chi tiết tòa nhà của tôi |
| `GET` | `/admin/buildings` | `ADMIN` | Danh sách tòa nhà để duyệt (kèm thông tin chủ trọ) |
| `GET` | `/admin/buildings/:buildingId` | `ADMIN` | Chi tiết tòa nhà cho admin |
| `GET` | `/rooms` | Public | Tìm phòng (`province`, `ward`, `minPrice`, `maxPrice`, `genderPolicy`, phân trang) |
| `GET` | `/rooms/:roomId` | Public | Chi tiết phòng |
| `POST` | `/rooms` | `LANDLORD` | Tạo phòng trong tòa nhà đã duyệt |
| `PATCH` | `/rooms/:roomId` | `LANDLORD` | Cập nhật phòng |
| `DELETE` | `/rooms/:roomId` | `LANDLORD` | Xóa mềm phòng |
| `POST` | `/rooms/:roomId/mark-ready` | `LANDLORD` | Chuyển phòng `maintenance → available` |
| `GET` | `/me/rooms` | `LANDLORD` | Danh sách phòng của tôi |

- **Swagger** (chạy local): `http://localhost:3002/api/v1/tenancy/swagger`
- **Hợp đồng OpenAPI chuẩn**: repo [`be`](https://github.com/pbl6-home-renter/be) (`src/paths/buildings`, `rooms`, `administrative-units`, …). Mọi thay đổi API phải cập nhật spec ở đó và bundle lại.
- **Tài liệu nội bộ**: [`docs/architecture.md`](docs/architecture.md) (tầng, layout module, quy ước `<noun>-<verb>`, đồng bộ `shared/`, kiểm tra dependency rule) · [`docs/transactional-outbox-design.md`](docs/transactional-outbox-design.md) (outbox, relay, RabbitMQ topology, inbox).
- **Định tuyến gateway**: thêm route mới theo [`api-gateway/docs/02-routing.md`](https://github.com/pbl6-home-renter/api-gateway/blob/main/docs/02-routing.md).

> [!NOTE]
> Endpoint nội bộ (service-to-service) đặt dưới `internal/...`, nằm ngoài prefix `api/v1` nên gateway không route tới; xác thực bằng `@InternalOnly()` + `X-Service-Token`.

## Triển khai

- **CI/CD** — [`deploy.yml`](.github/workflows/deploy.yml) chạy khi push `main` (hoặc `workflow_dispatch`): build image `linux/amd64`, push `<DOCKERHUB_USERNAME>/tenancy-service:latest`, rồi SSH vào EC2 và chạy `DEPLOY_STACK=internal bash ./scripts/deploy.sh tenancy` trong repo [`infra`](https://github.com/pbl6-home-renter/infra). Bước deploy tự bỏ qua nếu thiếu secret `EC2_HOST`/`EC2_SSH_KEY`.
- **Host** — service chạy trên host **internal** (cùng Identity-Service), chỉ truy cập qua gateway ở host edge; cổng `3002` không được public.
- **Migration** — `start.sh` tự chạy `migration:run:prod` khi container khởi động.
- **Keepalive** — [`db-keepalive.yml`](.github/workflows/db-keepalive.yml) chạy hằng ngày (cron `17 3 * * *`) với secret `SUPABASE_DATABASE_URL`; có thể chạy tay với `dry_run`.

## Đóng góp

1. Tạo nhánh từ `develop`: `feature/<id>-<slug>` (hoặc `fix/`, `hotfix/`, `docs/`, `ci/`), với task ID theo `pm/phase-N/issues/`, vd. `feature/p6-08-room-search`.
2. Commit message tiếng Anh theo **Conventional Commits** (`feat(room): ...`, `fix(building): ...`, `ci(deploy): ...`). Husky + lint-staged tự chạy `oxlint --fix` và `prettier` trên file staged.
3. Trước khi mở PR: `npm run build`, `npm run lint`, `npm run format:check`; thay đổi API thì cập nhật spec trong [`be`](https://github.com/pbl6-home-renter/be).
4. Mở PR vào `develop`, cần ≥ 1 reviewer, merge kiểu **squash**. Luồng nhánh: `main` ← `develop` ← `feature/*`.

> [!IMPORTANT]
> Không push trực tiếp lên `main` hoặc `develop`. Không sửa `src/shared/` trong repo này — thay đổi ở `boilerplate` rồi đồng bộ sang (xem [`docs/architecture.md`](docs/architecture.md) §6).

## Hệ sinh thái Rentify

| Repo | Vai trò |
|---|---|
| [`api-gateway`](https://github.com/pbl6-home-renter/api-gateway) | Reverse proxy: định tuyến theo prefix, xác thực JWT/JWKS, rate limit |
| [`Identity-Service`](https://github.com/pbl6-home-renter/Identity-Service) | Xác thực, người dùng, hồ sơ chủ trọ; phát hành JWT RS256 |
| [**`Tenancy-Service`**](https://github.com/pbl6-home-renter/Tenancy-Service) | Tòa nhà, phòng, đơn vị hành chính |
| [`boilerplate`](https://github.com/pbl6-home-renter/boilerplate) | Template NestJS mà mọi backend service được fork từ |
| [`be`](https://github.com/pbl6-home-renter/be) | Hợp đồng OpenAPI 3.0 chuẩn (canonical) |
| [`fe`](https://github.com/pbl6-home-renter/fe) | Web cho chủ trọ (React + Vite) |
| [`mobile`](https://github.com/pbl6-home-renter/mobile) | Ứng dụng Android cho người thuê & chủ trọ |
| [`infra`](https://github.com/pbl6-home-renter/infra) | Docker Compose + Caddy cho hai host EC2 |

## Giấy phép

Dự án học thuật thuộc học phần PBL6 — Trường Đại học Bách khoa, Đại học Đà Nẵng. Chưa phát hành theo giấy phép mã nguồn mở.
