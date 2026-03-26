/**
 * Sprint 67: F210 — 이메일 발송 서비스
 * Workers fetch 기반, Resend API 사용 (API key 없으면 로그만)
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
}

export class EmailService {
  constructor(private apiKey?: string) {}

  async send(payload: EmailPayload): Promise<EmailResult> {
    if (!this.apiKey) {
      console.log(`[EMAIL_LOG] To: ${payload.to}, Subject: ${payload.subject}`);
      return { success: true, messageId: "log-only" };
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Foundry-X <noreply@fx.minu.best>",
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    });

    const data = await res.json() as { id?: string };
    return { success: res.ok, messageId: data.id };
  }
}
