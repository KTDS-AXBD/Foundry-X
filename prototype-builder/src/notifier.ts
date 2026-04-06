import type { BuilderConfig } from './types.js';

export interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
}

interface SlackBlock {
  type: 'section' | 'divider' | 'header';
  text?: { type: 'mrkdwn' | 'plain_text'; text: string };
  fields?: { type: 'mrkdwn'; text: string }[];
}

/**
 * Prototype 빌드 완료 알림 메시지 생성
 */
export function buildCompletionMessage(params: {
  name: string;
  status: 'live' | 'failed';
  deployUrl?: string;
  qualityScore?: number;
  rounds?: number;
  cost?: number;
  errorMessage?: string;
}): SlackMessage {
  const emoji = params.status === 'live' ? ':white_check_mark:' : ':x:';
  const statusText = params.status === 'live' ? 'Live' : 'Failed';

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${emoji} Prototype ${statusText}: ${params.name}` },
    },
  ];

  if (params.status === 'live' && params.deployUrl) {
    blocks.push({
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*URL:*\n<${params.deployUrl}>` },
        { type: 'mrkdwn', text: `*Quality:* ${params.qualityScore?.toFixed(2) ?? 'N/A'}` },
        { type: 'mrkdwn', text: `*Rounds:* ${params.rounds ?? 'N/A'}` },
        { type: 'mrkdwn', text: `*Cost:* $${params.cost?.toFixed(2) ?? 'N/A'}` },
      ],
    });
  }

  if (params.status === 'failed' && params.errorMessage) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Error:*\n\`\`\`${params.errorMessage}\`\`\`` },
    });
  }

  return {
    text: `Prototype ${statusText}: ${params.name}`,
    blocks,
  };
}

/**
 * Slack Webhook으로 메시지 전송
 */
export async function sendSlackNotification(
  message: SlackMessage,
  config: Pick<BuilderConfig, 'slackWebhookUrl'>,
): Promise<boolean> {
  if (!config.slackWebhookUrl) return false;

  try {
    const response = await fetch(config.slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    return response.ok;
  } catch {
    return false;
  }
}
