import { Injectable, OnModuleInit } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ComplianceRuleService implements OnModuleInit {
  constructor(private readonly db: DbService) {}

  async onModuleInit() {
    await this.seedDefaultRules();
  }

  private async seedDefaultRules() {
    const defaultRules = [
      {
        ruleKey: 'PF_ELIGIBILITY_LIMIT',
        ruleName: 'PF Eligibility Limit',
        threshold: 15000,
        description: 'Salary threshold limit for mandatory PF eligibility',
      },
      {
        ruleKey: 'ESI_GROSS_LIMIT',
        ruleName: 'ESI Gross Limit',
        threshold: 21000,
        description:
          'Salary threshold limit for ESI contribution applicability',
      },
    ];

    for (const rule of defaultRules) {
      await this.db.complianceRule.upsert({
        where: { ruleKey: rule.ruleKey },
        update: {},
        create: rule,
      });
    }
  }

  async getThreshold(
    ruleKey: string,
    fallback: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ? tx : this.db;
    const rule = await client.complianceRule.findUnique({
      where: { ruleKey, isActive: true },
    });
    return rule ? rule.threshold : fallback;
  }

  async evaluateEligibility(
    grossSalary: number,
    tx?: Prisma.TransactionClient,
  ): Promise<{
    pfApplicable: boolean;
    esiApplicable: boolean;
    requiredForms: ('PF_FORM11' | 'PF_FORM2' | 'ESI_FORM1')[];
  }> {
    const esiLimit = await this.getThreshold('ESI_GROSS_LIMIT', 21000, tx);

    // PF is always applicable as per the original hardcoded rule (pfApplicable = true)
    const pfApplicable = true;
    const esiApplicable = grossSalary <= esiLimit;

    const requiredForms: ('PF_FORM11' | 'PF_FORM2' | 'ESI_FORM1')[] = [];
    if (pfApplicable) {
      requiredForms.push('PF_FORM11', 'PF_FORM2');
    }
    if (esiApplicable) {
      requiredForms.push('ESI_FORM1');
    }

    return {
      pfApplicable,
      esiApplicable,
      requiredForms,
    };
  }
}
