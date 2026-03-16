import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => (
  <Box borderStyle="round" paddingX={2} flexDirection="column">
    <Text bold color="cyan">{title}</Text>
    {subtitle && <Text dimColor>{subtitle}</Text>}
  </Box>
);
