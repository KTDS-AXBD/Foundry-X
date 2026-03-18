'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AutoMergeConfig {
  autoMerge: boolean;
  requireHumanApproval: boolean;
  maxAutoMergePerDay: number;
  sddScoreThreshold: number;
  qualityScoreThreshold: number;
}

const DEFAULT_CONFIG: AutoMergeConfig = {
  autoMerge: true,
  requireHumanApproval: false,
  maxAutoMergePerDay: 10,
  sddScoreThreshold: 80,
  qualityScoreThreshold: 70,
};

interface AutoMergeSettingsProps {
  config?: AutoMergeConfig;
  onSave?: (config: AutoMergeConfig) => void;
}

export function AutoMergeSettings({ config = DEFAULT_CONFIG, onSave }: AutoMergeSettingsProps) {
  const [settings, setSettings] = useState<AutoMergeConfig>(config);

  const handleToggle = (key: 'autoMerge' | 'requireHumanApproval') => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNumber = (key: 'maxAutoMergePerDay' | 'sddScoreThreshold' | 'qualityScoreThreshold', value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0) {
      setSettings(prev => ({ ...prev, [key]: num }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Auto-Merge Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.autoMerge}
            onChange={() => handleToggle('autoMerge')}
            className="rounded"
          />
          Enable auto-merge
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.requireHumanApproval}
            onChange={() => handleToggle('requireHumanApproval')}
            className="rounded"
          />
          Require human approval
        </label>

        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs">
            Max daily merges
            <input
              type="number"
              value={settings.maxAutoMergePerDay}
              onChange={(e) => handleNumber('maxAutoMergePerDay', e.target.value)}
              className="w-full mt-1 rounded border px-2 py-1 text-sm bg-background"
              min={1}
              max={100}
            />
          </label>
          <label className="text-xs">
            SDD threshold
            <input
              type="number"
              value={settings.sddScoreThreshold}
              onChange={(e) => handleNumber('sddScoreThreshold', e.target.value)}
              className="w-full mt-1 rounded border px-2 py-1 text-sm bg-background"
              min={0}
              max={100}
            />
          </label>
          <label className="text-xs">
            Quality threshold
            <input
              type="number"
              value={settings.qualityScoreThreshold}
              onChange={(e) => handleNumber('qualityScoreThreshold', e.target.value)}
              className="w-full mt-1 rounded border px-2 py-1 text-sm bg-background"
              min={0}
              max={100}
            />
          </label>
        </div>

        <Button
          size="sm"
          onClick={() => onSave?.(settings)}
          className="w-full"
        >
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}
