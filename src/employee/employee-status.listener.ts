import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DbService } from '../db/db.service';
import { ComplianceService } from '../compliance/compliance.service';
import { EmailService } from '../email/email.service';
import { Subject } from 'rxjs';

interface StatusChangedPayload {
  employeeId: string;
  toStatus: string;
  email?: string;
  name?: string;
}

@Injectable()
export class EmployeeStatusListener {
  private readonly logger = new Logger(EmployeeStatusListener.name);
  public static readonly statusChange$ = new Subject<{
    employeeId: string;
    newStatus: string;
    timestamp: string;
  }>();

  constructor(
    private readonly db: DbService,
    private readonly complianceService: ComplianceService,
    private readonly emailService: EmailService,
  ) {}

  @OnEvent('employee.status_changed')
  async handleEmployeeStatusChanged(event: {
    id: string;
    eventType: string;
    payload: StatusChangedPayload;
  }) {
    this.logger.log(
      `Received outbox event: ${event.id} of type ${event.eventType}`,
    );
    const { employeeId, toStatus, email, name } = event.payload;

    // Push event to SSE stream
    EmployeeStatusListener.statusChange$.next({
      employeeId,
      newStatus: toStatus,
      timestamp: new Date().toISOString(),
    });

    try {
      if (toStatus === 'COMPLIANCE_PROCESSING') {
        // Auto-generate compliance forms
        await this.complianceService.generateForms(employeeId);

        // Send hire-confirmation email
        if (email && name) {
          await this.emailService.sendHireConfirmation(email, name);
        }
      }

      // Mark the outbox event as processed in the database
      await this.db.outboxEvent.update({
        where: { id: event.id },
        data: { processed: true },
      });

      this.logger.log(`Outbox event ${event.id} processed successfully`);
    } catch (error) {
      this.logger.error(`Error processing outbox event ${event.id}:`, error);
      // We can implement retry mechanism or record failure here if required.
    }
  }
}
