import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';

@Injectable()
export class OutboxService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Persists an OutboxEvent record using the provided Prisma transaction client,
   * then emits the event via EventEmitter2 to be processed asynchronously.
   */
  async createAndEmitEvent(
    tx: Prisma.TransactionClient,
    eventType: string,
    payload: any,
  ) {
    const event = await tx.outboxEvent.create({
      data: {
        eventType,
        payload: payload as Prisma.InputJsonValue,
      },
    });

    // Emit event in-memory for immediate, async local consumption.
    // The listener can process side-effects and then mark this event as processed.
    this.eventEmitter.emit(eventType, event);

    return event;
  }
}
