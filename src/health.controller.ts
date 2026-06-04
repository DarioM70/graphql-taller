import { Controller, Get } from '@nestjs/common';

/** Liveness probe used by the cloud platform (Railway) — GET /api/health. */
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}
