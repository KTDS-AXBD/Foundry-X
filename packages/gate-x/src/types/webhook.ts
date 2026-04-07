export type WebhookEventType =
  | "evaluation.completed"
  | "evaluation.failed"
  | "evaluation.started"
  | "decision.made";

export const WEBHOOK_EVENT_TYPES: WebhookEventType[] = [
  "evaluation.completed",
  "evaluation.failed",
  "evaluation.started",
  "decision.made",
];

export interface WebhookSubscription {
  id: string;
  orgId: string;
  url: string;
  events: WebhookEventType[];
  secret: string;
  description: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDispatchPayload {
  event: WebhookEventType;
  timestamp: string;
  orgId: string;
  data: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
  subscriptionId: string;
  status: "delivered" | "failed";
  statusCode?: number;
  error?: string;
}
