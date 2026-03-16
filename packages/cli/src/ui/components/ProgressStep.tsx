import React from 'react';
import { Box, Text } from 'ink';

interface Step {
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail?: string;
}

interface ProgressStepProps {
  steps: Step[];
}

const STATUS_CONFIG = {
  done:    { icon: '\u2713', color: 'green' },
  running: { icon: '\u25CF', color: 'cyan' },
  pending: { icon: '\u25CB', color: undefined },
  error:   { icon: '\u2717', color: 'red' },
} as const;

export const ProgressStep: React.FC<ProgressStepProps> = ({ steps }) => (
  <Box flexDirection="column">
    {steps.map((step, i) => {
      const { icon, color } = STATUS_CONFIG[step.status];
      return (
        <Box key={i} gap={1}>
          <Text color={color} dimColor={step.status === 'pending'}>{icon}</Text>
          <Text dimColor={step.status === 'pending'}>{step.label}</Text>
          {step.detail && <Text dimColor>{step.detail}</Text>}
        </Box>
      );
    })}
  </Box>
);
