// ─── F356: Slack Notification Service (Sprint 160) ───
// Graceful degradation: webhook URL 미설정 시 로그만 기록

export interface SlackEvent {
  type: "build_complete" | "build_failed" | "feedback_received" | "ogd_pass";
  jobId: string;
  jobTitle: string;
  detail?: string;
}

const EVENT_EMOJI: Record<SlackEvent["type"], string> = {
  build_complete: ":white_check_mark:",
  build_failed: ":x:",
  feedback_received: ":speech_balloon:",
  ogd_pass: ":star:",
};

const EVENT_LABEL: Record<SlackEvent["type"], string> = {
  build_complete: "Prototype Build Complete",
  build_failed: "Prototype Build Failed",
  feedback_received: "Feedback Received",
  ogd_pass: "O-G-D Quality Passed",
};

export class SlackNotificationService {
  constructor(private webhookUrl?: string) {}

  async notify(event: SlackEvent): Promise<boolean> {
    if (!this.webhookUrl) {
      // Graceful skip — no webhook configured
      return false;
    }

    const emoji = EVENT_EMOJI[event.type];
    const label = EVENT_LABEL[event.type];
    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${emoji} *${label}*\n*Job:* ${event.jobTitle} (\`${event.jobId.slice(0, 8)}\`)`,
        },
      },
    ];

    if (event.detail) {
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: event.detail },
      });
    }

    try {
      const resp = await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks }),
      });
      return resp.ok;
    } catch {
      // Slack 알림 실패는 치명적이지 않음 — 무시
      return false;
    }
  }
}
