import React from 'react';
import { Switch, View } from 'react-native';

import { Drawer } from '@/components/patterns/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { STRINGS } from '@/constants/strings';

type AdvancedFilters = {
  location?: string;
  responsible?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  hasAlerts?: boolean;
};

type AdvancedFilterDrawerProps = {
  visible: boolean;
  onClose: () => void;
  filters?: AdvancedFilters;
  onChangeFilters?: (patch: Partial<AdvancedFilters>) => void;
  onApply?: () => void;
  onClear?: () => void;
  children?: React.ReactNode;
};

export const AdvancedFilterDrawer = ({
  visible,
  onClose,
  filters,
  onChangeFilters,
  onApply,
  onClear,
  children,
}: AdvancedFilterDrawerProps) => {
  const canRenderBuiltIn = filters && onChangeFilters;

  return (
    <Drawer open={visible} onClose={onClose} widthClassName="max-w-md">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <Typography variant="body" className="text-base font-semibold">
          {STRINGS.filters.advancedFiltersTitle}
        </Typography>
        <Button variant="outline" size="sm" onPress={onClose}>
          {STRINGS.common.close}
        </Button>
      </View>
      <View className="flex-1 px-4 py-4">
        {canRenderBuiltIn ? (
          <View className="gap-4">
            <FilterField label={STRINGS.filters.locationLabel}>
              <Input
                placeholder={STRINGS.filters.locationPlaceholder}
                value={filters.location ?? ''}
                onChangeText={(text) => onChangeFilters?.({ location: text })}
              />
            </FilterField>

            <FilterField label={STRINGS.filters.responsibleLabel}>
              <Input
                placeholder={STRINGS.filters.responsiblePlaceholder}
                value={filters.responsible ?? ''}
                onChangeText={(text) => onChangeFilters?.({ responsible: text })}
              />
            </FilterField>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <FilterField label={STRINGS.filters.updatedAfter}>
                  <Input
                    placeholder={STRINGS.filters.datePlaceholder}
                    value={filters.updatedAfter ?? ''}
                    onChangeText={(text) => onChangeFilters?.({ updatedAfter: text })}
                  />
                </FilterField>
              </View>
              <View className="flex-1">
                <FilterField label={STRINGS.filters.updatedBefore}>
                  <Input
                    placeholder={STRINGS.filters.datePlaceholder}
                    value={filters.updatedBefore ?? ''}
                    onChangeText={(text) => onChangeFilters?.({ updatedBefore: text })}
                  />
                </FilterField>
              </View>
            </View>

            <FilterField label={STRINGS.filters.hasAlerts}>
              <View className="flex-row items-center justify-between px-3 py-2 border border-border rounded-md bg-surface">
                <Typography variant="body" className="text-sm">
                  {STRINGS.filters.hasAlertsDescription}
                </Typography>
                <Switch
                  value={Boolean(filters.hasAlerts)}
                  onValueChange={(value) => onChangeFilters?.({ hasAlerts: value })}
                />
              </View>
            </FilterField>

            <View className="flex-row justify-end gap-3 pt-2">
              <Button variant="outline" onPress={onClear}>
                {STRINGS.common.reset}
              </Button>
              <Button variant="primary" onPress={onApply}>
                {STRINGS.common.applyFilters}
              </Button>
            </View>
          </View>
        ) : children ? (
          children
        ) : (
          <Typography variant="bodySmall" color="muted">
            {STRINGS.filters.noFilters}
          </Typography>
        )}
      </View>
    </Drawer>
  );
};

const FilterField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View className="gap-2">
    <Typography variant="label">{label}</Typography>
    {children}
  </View>
);
