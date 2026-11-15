import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { LandlordLockGraceScanCommand } from '../../application/commands/landlord-lock-grace-scan/landlord-lock-grace-scan.command';
import { LANDLORD_LOCK_GRACE_SCAN_INTERVAL_MS } from '../constants/landlord-lock-grace-scheduler.constant';

@Injectable()
export class LandlordLockGraceScheduler
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(LandlordLockGraceScheduler.name);
  private timer?: NodeJS.Timeout;
  private inFlight?: Promise<void>;

  constructor(private readonly commandBus: CommandBus) {}

  onApplicationBootstrap(): void {
    // CQRS registers command handlers during application bootstrap.
    this.timer = setInterval(
      () => this.tick(),
      LANDLORD_LOCK_GRACE_SCAN_INTERVAL_MS,
    );
    this.tick();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.inFlight;
  }

  private tick(): void {
    if (this.inFlight) return;
    this.inFlight = this.commandBus
      .execute<LandlordLockGraceScanCommand, number>(
        new LandlordLockGraceScanCommand(new Date()),
      )
      .then((count) => {
        if (count > 0)
          this.logger.log(`${count} landlord lock grace deadlines reached`);
      })
      .catch((error: unknown) =>
        this.logger.error(
          error instanceof Error ? error.message : String(error),
        ),
      )
      .finally(() => {
        this.inFlight = undefined;
      });
  }
}
