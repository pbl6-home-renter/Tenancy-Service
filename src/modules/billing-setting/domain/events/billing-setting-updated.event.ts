import { BILLING_SETTING_EVENTS } from '../constants/billing-setting-event.constants';
import { BillingSettingEvent } from './billing-setting-event';

export class BillingSettingUpdatedEvent extends BillingSettingEvent {
  readonly eventType = BILLING_SETTING_EVENTS.UPDATED;
  readonly routingKey = BILLING_SETTING_EVENTS.UPDATED;
}
