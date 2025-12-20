import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Filter, Search } from 'lucide-react-native';

import { Drawer } from '@/components/patterns/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { STRINGS } from '@/constants/strings';
import { UI_COLORS } from '@/constants/uiColors';
import { CalendarSourceType } from '@/schemas/calendarEvent';

type Option = { id: string; label: string };

type CalendarFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  sourceTypes: CalendarSourceType[];
  onToggleSourceType: (type: CalendarSourceType) => void;
  dogOptions: Option[];
  contactOptions: Option[];
  stageOptions: string[];
  selectedDogId?: string | null;
  selectedContactId?: string | null;
  selectedStage?: string | null;
  startDate?: string;
  endDate?: string;
  onChangeDates: (patch: { startDate?: string; endDate?: string }) => void;
  onSelectDog: (id: string | null) => void;
  onSelectContact: (id: string | null) => void;
  onSelectStage: (stage: string | null) => void;
  onReset: () => void;
};

const SOURCE_TYPE_OPTIONS: { value: CalendarSourceType; label: string }[] = [
  { value: 'transport', label: STRINGS.calendar.typeLabels.transport },
  { value: 'medical', label: STRINGS.calendar.typeLabels.medical },
  { value: 'quarantine', label: STRINGS.calendar.typeLabels.quarantine },
  { value: 'general', label: STRINGS.calendar.typeLabels.general },
  { value: 'system_task', label: STRINGS.calendar.typeLabels.system_task },
  { value: 'finance', label: STRINGS.calendar.typeLabels.finance },
  { value: 'external', label: STRINGS.calendar.typeLabels.external },
];

export const CalendarFilters = ({
  search,
  onSearchChange,
  sourceTypes,
  onToggleSourceType,
  dogOptions,
  contactOptions,
  stageOptions,
  selectedDogId,
  selectedContactId,
  selectedStage,
  startDate,
  endDate,
  onChangeDates,
  onSelectDog,
  onSelectContact,
  onSelectStage,
  onReset,
}: CalendarFiltersProps) => {
  const [picker, setPicker] = useState<'dog' | 'contact' | 'stage' | null>(null);

  const selectedDogLabel = useMemo(
    () => dogOptions.find((opt) => opt.id === selectedDogId)?.label ?? null,
    [dogOptions, selectedDogId]
  );
  const selectedContactLabel = useMemo(
    () => contactOptions.find((opt) => opt.id === selectedContactId)?.label ?? null,
    [contactOptions, selectedContactId]
  );

  const stageLabels = useMemo(() => [STRINGS.calendar.filters.anyStage, ...stageOptions], [stageOptions]);

  const closePicker = () => setPicker(null);

  return (
    <View className="px-6 py-3 bg-card border-b border-border gap-3">
      <View className="flex-row items-center gap-3">
        <Input
          value={search}
          onChangeText={onSearchChange}
          placeholder={STRINGS.calendar.filters.searchPlaceholder}
          containerClassName="flex-1"
          leftIcon={<Search size={16} color={UI_COLORS.mutedForeground} />}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        <Button variant="outline" size="sm" leftIcon={<Filter size={16} color={UI_COLORS.foreground} />} onPress={onReset}>
          {STRINGS.calendar.filters.clear}
        </Button>
      </View>

      <View className="gap-2">
        <Typography variant="label">{STRINGS.calendar.filters.typeLabel}</Typography>
        <View className="flex-row flex-wrap gap-2">
          {SOURCE_TYPE_OPTIONS.map((opt) => {
            const active = sourceTypes.includes(opt.value);
            return (
              <Button
                key={opt.value}
                variant={active ? 'primary' : 'outline'}
                size="sm"
                className="rounded-full"
                onPress={() => onToggleSourceType(opt.value)}>
                {opt.label}
              </Button>
            );
          })}
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <FilterButton
          label={STRINGS.calendar.filters.dogLabel}
          value={selectedDogLabel}
          onPress={() => setPicker('dog')}
        />
        <FilterButton
          label={STRINGS.calendar.filters.contactLabel}
          value={selectedContactLabel}
          onPress={() => setPicker('contact')}
        />
        <FilterButton
          label={STRINGS.calendar.filters.stageLabel}
          value={selectedStage ?? undefined}
          onPress={() => setPicker('stage')}
        />
      </View>

      <View className="gap-2">
        <Typography variant="label">{STRINGS.calendar.filters.dateRangeLabel}</Typography>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input
              value={startDate ?? ''}
              onChangeText={(val) => onChangeDates({ startDate: val })}
              placeholder={STRINGS.calendar.filters.startPlaceholder}
            />
          </View>
          <View className="flex-1">
            <Input
              value={endDate ?? ''}
              onChangeText={(val) => onChangeDates({ endDate: val })}
              placeholder={STRINGS.calendar.filters.endPlaceholder}
            />
          </View>
        </View>
      </View>

      <PickerDrawer
        title={STRINGS.calendar.filters.dogLabel}
        open={picker === 'dog'}
        onClose={closePicker}
        options={dogOptions}
        onSelect={(id) => {
          onSelectDog(id);
          closePicker();
        }}
      />

      <PickerDrawer
        title={STRINGS.calendar.filters.contactLabel}
        open={picker === 'contact'}
        onClose={closePicker}
        options={contactOptions}
        onSelect={(id) => {
          onSelectContact(id);
          closePicker();
        }}
      />

      <PickerDrawer
        title={STRINGS.calendar.filters.stageLabel}
        open={picker === 'stage'}
        onClose={closePicker}
        options={stageLabels.map((label) => ({ id: label === STRINGS.calendar.filters.anyStage ? '' : label, label }))}
        onSelect={(id) => {
          onSelectStage(id || null);
          closePicker();
        }}
      />
    </View>
  );
};

const FilterButton = ({ label, value, onPress }: { label: string; value?: string | null; onPress: () => void }) => (
  <Button variant="outline" size="sm" onPress={onPress}>
    {value ? `${label}: ${value}` : label}
  </Button>
);

export const PickerDrawer = ({
  title,
  open,
  onClose,
  options,
  onSelect,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  options: Option[];
  onSelect: (id: string | null) => void;
}) => (
  <Drawer open={open} onClose={onClose} widthClassName="max-w-md">
    <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
      <Typography variant="body" className="text-base font-semibold">
        {title}
      </Typography>
      <Button variant="outline" size="sm" onPress={onClose}>
        {STRINGS.common.close}
      </Button>
    </View>
    <ScrollView className="flex-1 px-4 py-4">
      <View className="gap-2">
        <Button variant="ghost" onPress={() => onSelect(null)}>
          {STRINGS.common.reset}
        </Button>
        {options.map((opt) => (
          <Button key={opt.id || opt.label} variant="secondary" onPress={() => onSelect(opt.id)}>
            {opt.label}
          </Button>
        ))}
      </View>
    </ScrollView>
  </Drawer>
);
