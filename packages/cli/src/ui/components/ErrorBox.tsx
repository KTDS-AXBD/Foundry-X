import React from 'react';
import { Box, Text } from 'ink';

interface ErrorBoxProps {
  title: string;
  message: string;
  code?: string;
}

export const ErrorBox: React.FC<ErrorBoxProps> = ({ title, message, code }) => (
  <Box borderStyle="round" borderColor="red" paddingX={2} flexDirection="column">
    <Text bold color="red">{title}</Text>
    <Text>{message}</Text>
    {code && <Text dimColor>Code: {code}</Text>}
  </Box>
);
