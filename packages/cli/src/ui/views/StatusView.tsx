import React from 'react';
import { Box, Text } from 'ink';
import type { StatusData } from '../types.js';
import { Header } from '../components/Header.js';
import { HealthBar } from '../components/HealthBar.js';
import { StatusBadge } from '../components/StatusBadge.js';

export const StatusView: React.FC<StatusData> = ({
  config,
  healthScore,
  integrity,
  plumbAvailable: _plumbAvailable,
}) => (
  <Box flexDirection="column" gap={1}>
    <Header title="Foundry-X Status" subtitle={`${config.mode} · ${config.template}`} />

    <Box flexDirection="column" paddingLeft={2}>
      <Text bold>Project</Text>
      <Text>  Mode:      {config.mode}</Text>
      <Text>  Template:  {config.template}</Text>
      <Text>  Init:      {config.initialized}</Text>
    </Box>

    <Box flexDirection="column" paddingLeft={2}>
      <Text bold>Health Score</Text>
      {healthScore ? (
        <Box flexDirection="column" paddingLeft={2}>
          <HealthBar label="Overall    " score={healthScore.overall} />
          <HealthBar label="Spec→Code  " score={healthScore.specToCode} />
          <HealthBar label="Code→Test  " score={healthScore.codeToTest} />
          <HealthBar label="Spec→Test  " score={healthScore.specToTest} />
        </Box>
      ) : (
        <Text dimColor>  unavailable (Plumb not installed)</Text>
      )}
    </Box>

    <Box flexDirection="column" paddingLeft={2}>
      <Text bold>Harness Integrity: {integrity.score}/100 ({integrity.passed ? 'PASS' : 'FAIL'})</Text>
      <Box flexDirection="column" paddingLeft={2}>
        {integrity.checks.map((c, i) => (
          <StatusBadge key={i} level={c.level} label={c.name} message={c.message} />
        ))}
      </Box>
    </Box>
  </Box>
);
