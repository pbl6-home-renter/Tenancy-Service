# Tenancy-Service

Service quản lý nghiệp vụ tenancy được xây dựng bằng **NestJS**, **Clean Architecture**, **Domain-Driven Design (DDD)**, **CQRS** và **TypeORM (PostgreSQL)**.

---

## 🚀 Tính năng nổi bật (Key Features)

- **Kiến trúc phân tầng sạch (Clean Architecture & DDD)**: Tách biệt hoàn toàn giữa tầng Domain, Use-case (Application), Infrastructure và Presentation. Business logic không phụ thuộc vào framework hay cơ sở dữ liệu.
- **CQRS Pattern (@nestjs/cqrs)**: Tách bạch rõ ràng giữa Commands (Ghi/Sửa/Xóa dữ liệu), Queries (Đọc dữ liệu) và Events (Xử lý sự kiện nội bộ).
- **Dependency Inversion (DI Tokens)**: Sử dụng Symbol DI Token để đảo ngược phụ thuộc giữa Domain và Infrastructure.
- **Cơ sở dữ liệu (TypeORM & PostgreSQL)**: Cấu hình Data Source tối ưu, tự động mapping snake_case naming strategy, hỗ trợ Migration và Database Seeding (`typeorm-extension`).
- **Xác thực stateless**: Tự xác minh access token RS256 từ Identity-Service qua JWKS, kiểm tra role và trạng thái tài khoản; không tin các header danh tính do API Gateway chuyển tiếp.
- **Xác thực service-to-service**: Endpoint `internal/*` dùng `SERVICE_TOKEN` riêng và không đi qua API Gateway.
- **Global Exception Filter chuẩn Clean Architecture**: Tự động nhận diện Domain Exception (`BaseException`), NestJS `HttpException`, và Validation errors để map HTTP status code chuẩn xác (404, 409, 400...).
- **Tài liệu API tự động (Swagger/OpenAPI)**: Tự động sinh tài liệu API tại `/api/v1/tenancy/swagger`.
- **Bộ khung thuần khiết (Pure Skeleton)**: Không chứa logic nghiệp vụ dư thừa, dễ dàng sao chép và mở rộng cho bất kỳ dự án nào.

---

## 📁 Cấu trúc thư mục (Directory Structure)

```text
boilerplate/
├── .github/
│   └── workflows/
│       ├── db-keepalive.yml        # Job tự động giữ kết nối Supabase
│       └── deploy.yml              # CI/CD Build linux/amd64 & Deploy EC2
├── scripts/                        # Scripts bổ trợ (keepalive, migration...)
├── src/
│   ├── main.ts                     # Bootstrap REST API, Swagger & Validation
│   ├── app.module.ts               # Root module nạp các module con
│   ├── config/
│   │   └── service.constants.ts    # Service path, metadata và database mặc định
│   │
│   ├── filter/                     # Exception filters (Global Exception Filter)
│   ├── interceptor/                # Interceptors (Logging, Transform...)
│   ├── utils/                      # Tiện ích dùng chung (UUID crypto...)
│   │
│   ├── shared/                     # Shared kernel & core hạ tầng dùng chung
│   │   ├── shared.module.ts        # Global Module
│   │   ├── application/             # Transaction and messaging ports
│   │   ├── configuration/          # Cấu hình Swagger, Logger, Naming Strategy
│   │   ├── decorators/auth/        # Public, Roles, AllowLocked, CurrentUser
│   │   ├── di-tokens/              # Global Dependency Injection Tokens
│   │   ├── domain/                 # Base Entity, Base Repo, Base Exception, VOs
│   │   ├── infra/                  # TypeORM, RabbitMQ & transaction adapters
│   │   ├── infrastructure/security/ # JWKS/RS256 access-token verifier
│   │   ├── presentation/guards/    # JWT, role, locked-account, service-token guards
│   │   └── services/               # ApiConfigService (type-safe env config)
│   │
│   └── modules/
│       ├── health/                 # DB health check (/api/v1/tenancy/health)
│       ├── inbox/                   # Consumer-side dedup (processed_events)
│       │   ├── application/         # InboxRepository port
│       │   └── infra/               # TypeORM persistence
│       ├── outbox/                  # Transactional Outbox & relay
│       │   ├── domain/              # Outbox state machine and repository port
│       │   ├── use-case/            # Relay orchestration
│       │   └── infra/               # TypeORM persistence and scheduler
│       └── sample/                 # [MODULE MẪU] Chuẩn Clean Architecture & CQRS
│           ├── sample.di-token.ts
│           ├── sample.module.ts
│           ├── domain/             # Entities, Repositories, Exceptions
│           ├── use-case/           # Application use cases
│           │   ├── commands/
│           │   │   ├── implements/ # Command objects
│           │   │   └── handlers/   # Command handlers
│           │   └── queries/
│           │       ├── implements/ # Query objects
│           │       └── handlers/   # Query handlers
│           ├── infra/              # TypeORM Entity, Repository impl, Mappers
│           └── presentation/       # Controllers, Requests, Response DTOs
│
├── .env.example                    # Template biến môi trường
├── Dockerfile                      # Multi-stage Dockerfile (build & runner)
├── .dockerignore
├── start.sh                        # Entrypoint script khởi động container
├── package.json
└── tsconfig.json
```

---

## ⚙️ Cấu hình biến môi trường (Environment Variables)

Hệ thống sử dụng file `.env` được đọc và validate thông qua `ApiConfigService`. Sao chép từ mẫu:

```bash
cp .env.example .env
```

### Bảng chi tiết các biến:

| Biến | Mặc định / Mẫu | Bắt buộc | Mô tả chi tiết |
| :--- | :--- | :---: | :--- |
| **Cấu hình ứng dụng** | | | |
| `APP_NAME` | `tenancy-service` | Không | Tên hiển thị của ứng dụng trong Swagger/Logs |
| `PORT` | `3002` | Có | Cổng HTTP server của tenancy-service |
| `NODE_ENV` | `dev` / `production` | **Có** | Môi trường chạy (`dev`, `production`, `test`) |
| `API_DOMAIN` | `localhost` | Không | Domain chạy API (dùng cho Swagger Docs) |
| `API_VERSION` | `1.0.0` | Không | Phiên bản API hiện tại |
| `ENABLE_DOCUMENTATION` | `true` | Không | Bật/Tắt Swagger UI tại `/api/v1/tenancy/swagger` |
| `LOG_LEVEL` | `debug` / `info` | Không | Mức độ log (`debug`, `info`, `warn`, `error`) |
| **Xác thực** | | | |
| `JWKS_URL` | `http://localhost:3001/api/v1/.well-known/jwks.json` | Có nếu không dùng `JWT_PUBLIC_KEY` | JWKS endpoint của Identity-Service để xác minh RS256 access token |
| `JWT_PUBLIC_KEY` | *(PEM public key)* | Có nếu không dùng `JWKS_URL` | Public key RS256 trực tiếp; dùng thay JWKS khi cần |
| `JWT_ISSUER` | `rentify-identity` | Không | Giá trị issuer phải khớp access token |
| `JWT_AUDIENCE` | `rentify-api` | Không | Giá trị audience phải khớp access token |
| `SERVICE_TOKEN` | *(để trống = tắt endpoint nội bộ)* | Không | Shared token bắt buộc cho các handler được đánh dấu `@InternalOnly()` |
| **Cơ sở dữ liệu (PostgreSQL / Supabase)** | | | |
| `DATABASE_URL` | `postgresql://.../tenancy_db` | Tùy chọn | Chuỗi kết nối đầy đủ; phải trỏ tới `tenancy_db` |
| `DB_HOST` | `localhost` | Có nếu không dùng `DATABASE_URL` | Host database |
| `DB_PORT` | `5432` | Có nếu không dùng `DATABASE_URL` | Port database |
| `DB_USERNAME` | `postgres` | Có nếu không dùng `DATABASE_URL` | Tên người dùng database |
| `DB_PASSWORD` | `postgres` | Có nếu không dùng `DATABASE_URL` | Mật khẩu database |
| `DB_DATABASE` | `tenancy_db` | Có nếu không dùng `DATABASE_URL` | Tên database; chỉ chấp nhận `tenancy_db` |
| `DB_SSL` | `true` / `false` | **Có** | Đặt `true` khi kết nối Supabase Cloud (bắt buộc SSL) |
| `ENABLE_ORM_LOGS` | `false` | Không | Bật `true` nếu muốn in câu lệnh SQL ra terminal khi debug |
| `MIGRATION_DATABASE_URL` | `postgresql://.../tenancy_db` | Không | Connection string cho migration; nếu cấu hình phải trỏ tới `tenancy_db` |
| **RabbitMQ Message Broker** | | | |
| `RABBITMQ_DEFAULT_USER` | `guest` | Không | Tài khoản đăng nhập RabbitMQ |
| `RABBITMQ_DEFAULT_PASS` | `guest` | Không | Mật khẩu RabbitMQ |
| `RABBITMQ_URL` | `amqp://...` | **Có** | Chuỗi kết nối RabbitMQ (`amqp://user:pass@localhost:5672` khi local, hoặc `amqp://...:5672@rabbitmq:5672` khi chạy Docker) |
| **Transactional Outbox** | | | |
| `RABBITMQ_EXCHANGE` | `tenancy_service.events` | Không | Durable topic exchange dùng cho integration events |
| `RABBITMQ_PREFETCH` | `10` | Không | Prefetch của channel mặc định (consumer queue dùng prefetch 1 để giữ thứ tự) |
| `RABBITMQ_CONSUMER_MAX_ATTEMPTS` | `5` | Không | Tổng số lần xử lý một message trước khi chuyển vào `<queue>.dlq` |
| `RABBITMQ_CONSUMER_RETRY_DELAY_MS` | `10000` | Không | Thời gian message chờ trong `<queue>.retry` trước khi xử lý lại |
| `OUTBOX_RELAY_ENABLED` | `true` | Không | Bật/tắt relay scheduler |
| `OUTBOX_RELAY_INTERVAL_MS` | `1000` | Không | Chu kỳ poll outbox |
| `OUTBOX_MAX_ATTEMPTS` | `10` | Không | Tổng số lần publish (tính cả lần đầu) trước khi chuyển `FAILED` |
| `OUTBOX_RETENTION_MS` | `604800000` | Không | Thời gian giữ row `PUBLISHED` |
| **Redis Cache (Tùy chọn)** | | | |
| `REDIS_HOST` | `localhost` | Không | Host Redis server |
| `REDIS_PORT` | `6379` | Không | Cổng Redis |
| **SMTP Mailer (Tùy chọn)** | | | |
| `MAIL_HOST` | `smtp.gmail.com` | Không | SMTP server gửi mail |
| `MAIL_PORT` | `465` | Không | Cổng SMTP |
| `MAIL_USER` | `your_email@...` | Không | Tài khoản gửi mail |
| `MAIL_PASS` | `app_password` | Không | App password Google |
| `MAIL_FROM` | `noreply@...` | Không | Tên hiển thị người gửi |

---

## 🔄 Luồng xử lý CQRS (CQRS Architecture Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Controller as SampleController (Presentation)
    participant CommandBus as CommandBus (CQRS)
    participant Handler as CreateSampleCommandHandler
    participant Domain as SampleEntity (Domain)
    participant Repo as SampleRepository (Infra)
    participant DB as PostgreSQL Database

    Client->>Controller: POST /api/v1/samples (CreateSampleRequest)
    Controller->>CommandBus: execute(new CreateSampleCommand(...))
    CommandBus->>Handler: execute(command)
    Handler->>Domain: SampleEntity.create(props)
    Handler->>Repo: save(sample)
    Repo->>DB: INSERT INTO samples
    Handler-->>Controller: Return Domain SampleEntity
    Controller-->>Client: 201 Created (SampleResponseDto)
```

---

## 🛠️ Hướng dẫn cài đặt & Khởi chạy

### 1. Khởi chạy trực tiếp (Local Development)

#### Bước 1: Cài đặt dependencies:
```bash
npm install
```

#### Bước 2: Cấu hình biến môi trường:
```bash
cp .env.example .env
# Cấu hình thông tin database tenancy_db và RabbitMQ trong .env
```

#### Bước 3: Chạy Database Migrations:
```bash
npm run migration:run
```

#### Bước 4: Khởi chạy ứng dụng:
```bash
npm run start:dev
```
Health check: `http://localhost:3002/api/v1/tenancy/health`

Swagger API Docs: `http://localhost:3002/api/v1/tenancy/swagger`

Các route yêu cầu access token hợp lệ mặc định; dùng `@Public()` cho route công khai và `@Roles()` để giới hạn role. Health check là route công khai nhưng vẫn kiểm tra kết nối database.

---

### 2. Khởi chạy bằng Docker (Local Container)

```bash
# Build Docker image
docker build -t tenancy-service:local .

# Chạy container
docker run -p 3002:3002 --env-file .env tenancy-service:local
```

---

## 📋 Hướng dẫn thêm Module mới chuẩn Clean Architecture & CQRS

Khi bạn muốn thêm một tính năng/domain mới (ví dụ `products`):

### Bước 1: Tạo cấu trúc thư mục

Tạo thư mục `src/modules/products/` với các thư mục con:

- `domain/`: `entities/`, `repositories/`, `exceptions/`
- `use-case/`: `commands/`, `queries/`
- `infra/`: `persistence/`, `mappers/`
- `presentation/`: `controllers/`, `request/`, `response/`

### Bước 2: Định nghĩa DI Token

Tạo `products/product.di-token.ts`:

```typescript
export const PRODUCT_DI_TOKEN = {
  REPOSITORY: Symbol('PRODUCT_REPOSITORY'),
} as const;
```

### Bước 3: Xây dựng Domain Model & Repository Interface

1. Tạo Entity kế thừa `BaseEntity` tại `domain/entities/product.entity.ts`.
2. Tạo interface `ProductRepository` kế thừa `BaseRepository<ProductEntity>` tại `domain/repositories/product.repository.ts`.

### Bước 4: Tạo Tầng Hạ Tầng (Infrastructure)

1. Tạo TypeORM entity kế thừa `AbstractEntity` tại `infra/persistence/product.typeorm-entity.ts`.
2. Tạo mapper chuyển đổi 2 chiều giữa Domain Entity và TypeORM Entity tại `infra/mappers/product.mapper.ts`.
3. Tạo repository class triển khai interface `ProductRepository` tại `infra/persistence/product.repository.ts`.

### Bước 5: Viết Use Cases (CQRS)

1. **Command**: Tạo `CreateProductCommand` và `CreateProductCommandHandler`.
2. **Query**: Tạo `GetProductByIdQuery` và `GetProductByIdQueryHandler`.

### Bước 6: Xây dựng Presentation Layer

1. Tạo DTOs validation tại `presentation/request/` và `presentation/response/`.
2. Tạo Controller inject `CommandBus` và `QueryBus` tại `presentation/controllers/product.controller.ts`.

### Bước 7: Khai báo Module

Tạo `products.module.ts`:

```typescript
@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([ProductTypeormEntity])],
  controllers: [ProductController],
  providers: [
    {
      provide: PRODUCT_DI_TOKEN.REPOSITORY,
      useClass: TypeOrmProductRepository,
    },
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [PRODUCT_DI_TOKEN.REPOSITORY],
})
export class ProductsModule {}
```

Cuối cùng, import `ProductsModule` vào `app.module.ts`.

---

## 📜 Các lệnh Scripts hữu ích (NPM Scripts)

| Lệnh                                               | Ý nghĩa                                            |
| :------------------------------------------------- | :------------------------------------------------- |
| `npm run start:dev`                                | Chạy ứng dụng ở chế độ dev (watch mode)            |
| `npm run build`                                    | Biên dịch TypeScript sang JavaScript trong `dist/` |
| `npm run lint`                                     | Kiểm tra và sửa lỗi coding convention với ESLint   |
| `npm run format`                                   | Tự động format code với Prettier                   |
| `npm run migration:create -- name=MigrationName`   | Tạo một file migration mới                         |
| `npm run migration:generate -- name=MigrationName` | Tự động sinh migration từ Entity thay đổi          |
| `npm run migration:run`                            | Áp dụng các migration chưa chạy vào Database       |
| `npm run migration:revert`                         | Hoàn tác migration gần nhất                        |
| `npm run test`                                     | Chạy unit test với Jest                            |

---

## 🧭 Kiến trúc DDD & Clean Architecture

Boilerplate tổ chức mỗi bounded context theo dependency direction:

```text
Presentation → Application/Use-case → Domain
       ↓                 ↓
Infrastructure ─────────┘
```

- `domain/`: Entity, Aggregate Root, Value Object, domain event và repository port.
- `use-case/`: command/query handlers và orchestration nghiệp vụ.
- `infra/`: TypeORM entity, mapper, repository adapter, RabbitMQ adapter và scheduler.
- `presentation/`: HTTP controller, request/response DTO và broker subscriber.

Domain không import NestJS, TypeORM hay RabbitMQ. Infrastructure implement port bằng
DI token. `BaseEntity` chỉ chứa identity/lifecycle; aggregate có behavior và là nơi
phát domain event. Entity đọc từ database phải được reconstitute để không phát lại event.

### Thêm module mới

```text
src/modules/<context>/
├── domain/
│   ├── entities/
│   ├── events/
│   ├── repositories/
│   └── exceptions/
├── use-case/
│   ├── commands/
│   └── queries/
├── infra/
│   ├── persistence/
│   ├── mappers/
│   └── messaging/
└── presentation/
    ├── controllers/
    ├── request/
    └── response/
```

Command thay đổi state và có thể phát domain event. Query chỉ đọc. Domain event mô tả
sự kiện trong bounded context; integration event là contract gửi qua message broker.

## 📬 Transactional Outbox và microservice events

Khi một command cần vừa ghi database vừa publish event, không publish trực tiếp trong
handler vì sẽ gặp dual-write problem. Boilerplate ghi aggregate và `outbox_messages`
trong cùng local transaction, sau đó relay publish message đã commit:

```text
HTTP Request
  → Controller
  → Command Handler
  → Aggregate
  → Repository + Outbox
  → Database Transaction
  → Outbox Relay
  → RabbitMQ topic exchange
  → Consumer queue + Inbox
```

Delivery là at-least-once, không phải exactly-once. Consumer dùng `messageId` và bảng
`processed_events` để bỏ qua duplicate. RabbitMQ dùng durable topic exchange, queue
riêng cho từng loại aggregate, kèm retry queue (TTL) và DLQ. Ordering chỉ được cam kết
trong cùng aggregate; các aggregate khác có thể xử lý độc lập. Message outbox `FAILED`
được gỡ bằng `npm run outbox:requeue -- <message-id>`.

Transaction context được truyền explicit qua `IUnitOfWork`, không dùng
`AsyncLocalStorage`. RabbitMQ adapter dùng `@golevelup/nestjs-rabbitmq` và publisher
confirm; `@nestjs/microservices`/`ClientProxy` không còn được sử dụng.

Tài liệu học tập đầy đủ: [`docs/transactional-outbox-design.md`](docs/transactional-outbox-design.md).

### Transactional Outbox quick start

```bash
npm install
cp .env.example .env
npm run migration:run
npm run start:dev
```

Các biến chính gồm `RABBITMQ_EXCHANGE`, `RABBITMQ_PREFETCH`, `OUTBOX_RELAY_INTERVAL_MS`,
`OUTBOX_MAX_ATTEMPTS` và `OUTBOX_RETENTION_MS`. Có thể tắt relay bằng
`OUTBOX_RELAY_ENABLED=false`.

## 🛡️ License

Dự án phát hành theo giấy phép MIT.
