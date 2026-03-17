"use client";

import type { RepoProfile } from "@foundry-x/shared";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export interface ModuleMapProps {
  profile: RepoProfile;
}

export default function ModuleMap({ profile }: ModuleMapProps) {
  return (
    <>
      <div className="mb-5 flex flex-wrap gap-6 text-sm text-muted-foreground">
        <span>
          Mode: <strong className="text-foreground">{profile.mode}</strong>
        </span>
        <span>
          Pattern:{" "}
          <strong className="text-foreground">
            {profile.architecturePattern}
          </strong>
        </span>
        <span>
          Languages:{" "}
          <strong className="text-foreground">
            {profile.languages.join(", ")}
          </strong>
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Module</TableHead>
            <TableHead>Path</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profile.modules.map((mod) => (
            <TableRow key={mod.path}>
              <TableCell className="font-medium text-primary">
                {mod.name}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {mod.path}
              </TableCell>
              <TableCell>{mod.role}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {profile.modules.length === 0 && (
        <p className="mt-5 text-center text-muted-foreground">
          No modules detected
        </p>
      )}
    </>
  );
}
