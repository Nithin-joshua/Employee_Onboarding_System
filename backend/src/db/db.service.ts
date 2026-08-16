import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DbService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async clear() {
    await this.user.deleteMany({});
    await this.document.deleteMany({});
    await this.complianceForm.deleteMany({});
    await this.milestone.deleteMany({});
    await this.employee.deleteMany({});
  }
}
