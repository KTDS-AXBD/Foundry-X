import React from 'react';
import { Box, Text } from 'ink';
import type { InitData } from '../types.js';
import { Header } from '../components/Header.js';
import { ProgressStep } from '../components/ProgressStep.js';

export const InitView: React.FC<InitData> = ({ steps, result, integrity }) => (
  <Box flexDirection="column" gap={1}>
    <Header title="Foundry-X Init" />

    <ProgressStep steps={steps} />

    <Text bold color="green">{'\n'}Foundry-X initialized successfully!</Text>

    {result.created.length > 0 && (
      <Box flexDirection="column" paddingLeft={2}>
        <Text bold>Created:</Text>
        {result.created.map((f, i) => (
          <Text key={i} color="green">  + {f}</Text>
        ))}
      </Box>
    )}

    {result.merged.length > 0 && (
      <Box flexDirection="column" paddingLeft={2}>
        <Text bold>Merged:</Text>
        {result.merged.map((f, i) => (
          <Text key={i} color="yellow">  ~ {f}</Text>
        ))}
      </Box>
    )}

    {result.skipped.length > 0 && (
      <Box flexDirection="column" paddingLeft={2}>
        <Text bold>Skipped:</Text>
        {result.skipped.map((f, i) => (
          <Text key={i} dimColor>  - {f}</Text>
        ))}
      </Box>
    )}

    <Text>{'\n'}  Harness Integrity: {integrity.score}/100</Text>
  </Box>
);
