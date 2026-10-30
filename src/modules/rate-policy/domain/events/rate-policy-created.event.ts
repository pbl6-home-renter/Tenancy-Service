import { RATE_POLICY_EVENTS } from '../constants/rate-policy-event.constants';
import { RatePolicyEvent } from './rate-policy-event';

export class RatePolicyCreatedEvent extends RatePolicyEvent {
  readonly eventType = RATE_POLICY_EVENTS.CREATED;
  readonly routingKey = RATE_POLICY_EVENTS.CREATED;
}
