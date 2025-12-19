import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { z } from 'zod';

import { ScreenGuard } from '@/components/patterns/ScreenGuard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { Typography } from '@/components/ui/Typography';
import { LAYOUT_STYLES } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useDog } from '@/hooks/useDog';
import { useSessionStore } from '@/stores/sessionStore';

const dogFormSchema = z.object({
  name: z.string().min(1, STRINGS.dogs.validation.nameRequired),
  stage: z.string().min(1, STRINGS.dogs.validation.stageRequired),
  location: z.string().min(1, STRINGS.dogs.validation.locationRequired),
  description: z.string().min(1, STRINGS.dogs.validation.descriptionRequired),
  responsible_person: z.string().optional(),
});

type DogFormState = z.infer<typeof dogFormSchema>;

const STAGES = STRINGS.dogs.formStages;

export default function EditDogScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dogId = Array.isArray(id) ? id[0] : id;
  const session = useSessionStore();
  const { data, isLoading } = useDog(session.activeOrgId ?? undefined, dogId ?? undefined);

  const [form, setForm] = useState<DogFormState>({
    name: '',
    stage: STAGES[0],
    location: '',
    description: '',
    responsible_person: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);

  const stageHelper = useMemo(() => `${STRINGS.dogs.form.stageOptionsHelperPrefix} ${STAGES.join(', ')}`, []);

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name,
        stage: data.stage,
        location: data.location,
        description: data.description,
        responsible_person: data.extra_fields.responsible_person ?? '',
      });
      setStatus(null);
    }
  }, [data]);

  const submit = () => {
    const result = dogFormSchema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0];
        if (typeof path === 'string') errs[path] = issue.message;
      });
      setErrors(errs);
      setStatus({ variant: 'error', message: 'Fix the highlighted fields and try again.' });
      return;
    }
    setErrors({});
    setStatus({ variant: 'success', message: STRINGS.dogs.mockSaved });
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScreenGuard session={session} isLoading={isLoading || !data} loadingLabel="Loading dog...">
        <ScrollView contentContainerStyle={LAYOUT_STYLES.scrollScreenPadded}>
          <View className="gap-4">
            <Typography variant="h3">{STRINGS.dogs.mockEditTitle}</Typography>

            <StatusMessage variant={status?.variant} message={status?.message ?? null} />

            <Input
              label={STRINGS.dogs.form.nameLabel}
              value={form.name}
              onChangeText={(name) => setForm((f) => ({ ...f, name }))}
              error={errors.name}
            />

            <Input
              label={STRINGS.dogs.form.stageLabel}
              value={form.stage}
              onChangeText={(stage) => setForm((f) => ({ ...f, stage }))}
              helper={stageHelper}
              error={errors.stage}
            />

            <Input
              label={STRINGS.dogs.form.locationLabel}
              value={form.location}
              onChangeText={(location) => setForm((f) => ({ ...f, location }))}
              error={errors.location}
            />

            <Input
              label={STRINGS.dogs.form.responsibleLabel}
              value={form.responsible_person ?? ''}
              onChangeText={(responsible_person) => setForm((f) => ({ ...f, responsible_person }))}
            />

            <Input
              label={STRINGS.dogs.form.descriptionLabel}
              multiline
              value={form.description}
              onChangeText={(description) => setForm((f) => ({ ...f, description }))}
              error={errors.description}
              className="min-h-24"
            />

            <Button onPress={submit}>{STRINGS.dogs.mockSaveChanges}</Button>
          </View>
        </ScrollView>
      </ScreenGuard>
    </SafeAreaView>
  );
}

