import { Injectable } from '@nestjs/common';

@Injectable()
export class LegacyService {
  // Reserved for the future ASP/legacy integration boundary.
  // Portal data is now served from PostgreSQL through Prisma.
}
