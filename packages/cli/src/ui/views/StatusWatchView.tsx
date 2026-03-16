import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { watch } from 'node:fs';
import type { StatusData } from '../types.js';
import { StatusView } from './StatusView.js';

interface StatusWatchViewProps {
  initialData: StatusData;
  cwd: string;
  refreshFn: (cwd: string) => Promise<StatusData>;
  interval?: number;
}

const IGNORE_PATTERNS = ['.foundry-x/logs', 'node_modules', '.git'];

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour12: false });
}

export const StatusWatchView: React.FC<StatusWatchViewProps> = ({
  initialData,
  cwd,
  refreshFn,
  interval = 500,
}) => {
  const [data, setData] = useState<StatusData>(initialData);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const { exit } = useApp();

  useInput((input) => {
    if (input === 'q') {
      exit();
    }
  });

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await refreshFn(cwd);
      setData(next);
      setLastUpdate(new Date());
    } catch {
      // Keep previous data on error — don't crash
    } finally {
      setRefreshing(false);
    }
  }, [cwd, refreshFn]);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const watcher = watch(cwd, { recursive: true }, (_event, filename) => {
      if (!filename) return;

      // Ignore paths that change frequently / are irrelevant
      const shouldIgnore = IGNORE_PATTERNS.some((p) => filename.startsWith(p));
      if (shouldIgnore) return;

      // Debounce: reset timer on each change, fire after interval ms of quiet
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void refresh();
      }, interval);
    });

    return () => {
      watcher.close();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [cwd, interval, refresh]);

  return (
    <Box flexDirection="column">
      <StatusView {...data} />
      <Box paddingLeft={2} marginTop={1}>
        <Text dimColor>
          Last: {formatTime(lastUpdate)}
          {refreshing ? ' (refreshing...)' : ''}
          {' · Press q to quit'}
        </Text>
      </Box>
    </Box>
  );
};
