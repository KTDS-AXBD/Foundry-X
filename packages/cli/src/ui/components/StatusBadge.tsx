import React from 'react';
import { Box, Text } from 'ink';

interface StatusBadgeProps {
  level: 'PASS' | 'WARN' | 'FAIL';
  label: string;
  message?: string;
}

const BADGE_CONFIG = {
  PASS: { icon: '\u2713', color: 'green' },
  WARN: { icon: '!', color: 'yellow' },
  FAIL: { icon: '\u2717', color: 'red' },
} as const;

export const StatusBadge: React.FC<StatusBadgeProps> = ({ level, label, message }) => {
  const { icon, color } = BADGE_CONFIG[level];

  return (
    <Box gap={1}>
      <Text color={color}>{icon}</Text>
      <Text bold>{label}</Text>
      {message && <Text dimColor>{message}</Text>}
    </Box>
  );
};
