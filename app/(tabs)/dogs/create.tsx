import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { ScreenGuard } from '@/components/patterns/ScreenGuard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { Typography } from '@/components/ui/Typography';
import { LAYOUT_STYLES } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
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

export default function CreateDogScreen() {
  const session = useSessionStore();
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
      <ScreenGuard session={session} loadingLabel="Loading create form...">
        <ScrollView contentContainerStyle={LAYOUT_STYLES.scrollScreenPadded}>
          <View className="gap-4">
            <Typography variant="h3">{STRINGS.dogs.mockCreateTitle}</Typography>

            <StatusMessage variant={status?.variant} message={status?.message ?? null} />

            <Input
              label={STRINGS.dogs.form.nameLabel}
              value={form.name}
              onChangeText={(name) => setForm((f) => ({ ...f, name }))}
              error={errors.name}
              placeholder={STRINGS.dogs.form.namePlaceholder}
            />

            <Input
              label={STRINGS.dogs.form.stageLabel}
              value={form.stage}
              onChangeText={(stage) => setForm((f) => ({ ...f, stage }))}
              helper={stageHelper}
              error={errors.stage}
              placeholder={STRINGS.dogs.form.stagePlaceholder}
            />

            <Input
              label={STRINGS.dogs.form.locationLabel}
              value={form.location}
              onChangeText={(location) => setForm((f) => ({ ...f, location }))}
              error={errors.location}
              placeholder={STRINGS.dogs.form.locationPlaceholder}
            />

            <Input
              label={STRINGS.dogs.form.responsibleLabel}
              value={form.responsible_person ?? ''}
              onChangeText={(responsible_person) => setForm((f) => ({ ...f, responsible_person }))}
              placeholder={STRINGS.dogs.form.responsiblePlaceholder}
            />

            <Input
              label={STRINGS.dogs.form.descriptionLabel}
              multiline
              value={form.description}
              onChangeText={(description) => setForm((f) => ({ ...f, description }))}
              error={errors.description}
              placeholder={STRINGS.dogs.form.descriptionPlaceholder}
              className="min-h-24"
            />

            <Button onPress={submit}>{STRINGS.dogs.mockSave}</Button>
          </View>
        </ScrollView>
      </ScreenGuard>
    </SafeAreaView>
  );
}

