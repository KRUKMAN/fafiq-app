import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { cn } from '@/components/ui/cn';
import { Typography } from '@/components/ui/Typography';

export type OrgSelectorProps = {
  activeOrgId: string | null;
  memberships: { org_id: string; org_name: string }[];
  switchOrg: (orgId: string) => void;
  ready: boolean;
  className?: string;
};

export function OrgSelector({ activeOrgId, memberships, switchOrg, ready, className }: OrgSelectorProps) {
  const [open, setOpen] = useState(false);

  if (!ready) return null;
  if (!memberships.length) {
    return (
      <View className={cn('px-3 py-2 border border-amber-200 bg-amber-50 rounded-md', className)}>
        <Typography variant="caption" className="text-amber-800 font-medium">
          No memberships found
        </Typography>
      </View>
    );
  }

  const active = memberships.find((m) => m.org_id === activeOrgId) ?? memberships[0];
  const hasChoices = memberships.length > 1;

  return (
    <View className={cn('relative', className)}>
      <Pressable
        accessibilityRole="button"
        onPress={() => hasChoices && setOpen((v) => !v)}
        className="flex-row items-center gap-2 px-3 py-2 rounded-full border border-border bg-white shadow-sm">
        <Typography variant="bodySmall" className="text-xs font-semibold text-gray-900">
          {active.org_name}
        </Typography>
        {hasChoices ? <Typography variant="caption" className="text-xs text-gray-500">▾</Typography> : null}
      </Pressable>

      {open ? (
        <View className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-white shadow-lg z-10">
          {memberships.map((m) => {
            const isActive = m.org_id === active.org_id;
            return (
              <Pressable
                key={m.org_id}
                accessibilityRole="button"
                onPress={() => {
                  switchOrg(m.org_id);
                  setOpen(false);
                }}
                className={cn('px-3 py-2', isActive && 'bg-surface')}>
                <Typography
                  variant="body"
                  className={cn('text-sm', isActive ? 'font-semibold text-gray-900' : 'text-gray-700')}>
                  {m.org_name}
                </Typography>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}


