import React from 'react';
import { Box, Text } from 'ink';
import type { SyncData } from '../types.js';
import { Header } from '../components/Header.js';
import { HealthBar } from '../components/HealthBar.js';

function ratio(matched: number, total: number): number {
  if (total === 0) return 100;
  return (matched / total) * 100;
}

export const SyncView: React.FC<SyncData> = ({ triangle, decisions, healthScore }) => {
  const allGaps = [
    ...triangle.specToCode.gaps,
    ...triangle.codeToTest.gaps,
    ...triangle.specToTest.gaps,
  ];

  return (
    <Box flexDirection="column" gap={1}>
      <Header title="SDD Triangle Sync" />

      <Box flexDirection="column" paddingLeft={2}>
        <Text bold>Triangle</Text>
        <Box flexDirection="column" paddingLeft={2}>
          <HealthBar label="Spec→Code  " score={ratio(triangle.specToCode.matched, triangle.specToCode.total)} />
          <HealthBar label="Code→Test  " score={ratio(triangle.codeToTest.matched, triangle.codeToTest.total)} />
          <HealthBar label="Spec→Test  " score={ratio(triangle.specToTest.matched, triangle.specToTest.total)} />
        </Box>
      </Box>

      {allGaps.length > 0 && (
        <Box flexDirection="column" paddingLeft={2}>
          <Text bold>Gaps ({allGaps.length})</Text>
          {allGaps.map((g, i) => (
            <Text key={i} color="yellow">  [{g.type}] {g.path}: {g.description}</Text>
          ))}
        </Box>
      )}

      {decisions.length > 0 && (
        <Box flexDirection="column" paddingLeft={2}>
          <Text bold>Decisions ({decisions.length})</Text>
          {decisions.map((d, i) => (
            <Text key={i}>  [{d.status}] {d.summary} ({d.source})</Text>
          ))}
        </Box>
      )}

      <Box paddingLeft={2}>
        <HealthBar label="Overall    " score={healthScore.overall} />
        <Text>  ({healthScore.grade})</Text>
      </Box>
    </Box>
  );
};
