import React from 'react';
import { Box, Text } from 'ink';

interface HealthBarProps {
  label: string;
  score: number;
  width?: number;
}

function getColor(score: number): string {
  if (score >= 90) return 'green';
  if (score >= 70) return 'yellow';
  return 'red';
}

export const HealthBar: React.FC<HealthBarProps> = ({ label, score, width = 20 }) => {
  const clamped = Math.max(0, Math.min(100, score));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;
  const color = getColor(clamped);

  return (
    <Box gap={1}>
      <Text>{label}</Text>
      <Text color={color}>
        {'\u2588'.repeat(filled)}{'\u2591'.repeat(empty)}
      </Text>
      <Text bold color={color}>{clamped}%</Text>
    </Box>
  );
};
