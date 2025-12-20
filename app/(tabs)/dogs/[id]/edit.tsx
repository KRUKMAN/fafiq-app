import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { z } from 'zod';

import { ScreenGuard } from '@/components/patterns/ScreenGuard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { Typography } from '@/components/ui/Typography';
import { LAYOUT_STYLES } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useDog } from '@/hooks/useDog';
import { useOrgSettings } from '@/hooks/useOrgSettings';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateDog } from '@/lib/data/dogs';
import { useSessionStore } from '@/stores/sessionStore';

const dogFormSchema = z.object({
  name: z.string().min(1, STRINGS.dogs.validation.nameRequired),
  stage: z.string().min(1, STRINGS.dogs.validation.stageRequired),
  location: z.string().min(1, STRINGS.dogs.validation.locationRequired),
  description: z.string().min(1, STRINGS.dogs.validation.descriptionRequired),
  responsible_person: z.string().optional(),
});

type DogFormState = z.infer<typeof dogFormSchema>;

export default function EditDogScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dogId = Array.isArray(id) ? id[0] : id;
  const session = useSessionStore();
  const { dogStages } = useOrgSettings(session.activeOrgId ?? undefined);
  const router = useRouter();
  const queryClient = useQueryClient();
  const stages: string[] = dogStages.length ? dogStages : [...STRINGS.dogs.formStages];
  const { data, isLoading } = useDog(session.activeOrgId ?? undefined, dogId ?? undefined);

  const [form, setForm] = useState<DogFormState>({
    name: '',
    stage: stages[0] ?? '',
    location: '',
    description: '',
    responsible_person: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);
  const supabaseReady = Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

  const stageHelper = useMemo(
    () => `${STRINGS.dogs.form.stageOptionsHelperPrefix} ${stages.join(', ')}`,
    [stages]
  );

  useEffect(() => {
    if (!form.stage && stages[0]) {
      setForm((prev) => ({ ...prev, stage: stages[0] }));
    }
  }, [form.stage, stages]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!session.activeOrgId) throw new Error('Select an organization before saving.');
      if (!dogId) throw new Error('Dog id missing.');
      if (stages.length && !stages.includes(form.stage.trim())) {
        throw new Error('Stage must be one of the organization stages.');
      }
      return updateDog(session.activeOrgId, dogId, {
        name: form.name.trim(),
        stage: form.stage.trim(),
        location: form.location.trim(),
        description: form.description.trim(),
        extra_fields: {
          ...data?.extra_fields,
          responsible_person: form.responsible_person?.trim() || undefined,
        },
      });
    },
    onSuccess: async (dog) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dogs', session.activeOrgId || ''] }),
        queryClient.invalidateQueries({ queryKey: ['dog', session.activeOrgId || '', dog.id] }),
      ]);
      setStatus({ variant: 'success', message: 'Dog updated. Returning to detail...' });
      setTimeout(() => router.back(), 400);
    },
    onError: (err: any) => {
      setStatus({ variant: 'error', message: err?.message ?? 'Failed to update dog.' });
    },
  });

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
    if (!supabaseReady) {
      setStatus({ variant: 'error', message: 'Supabase env vars missing. Configure Supabase to save.' });
      return;
    }
    setErrors({});
    setStatus(null);
    updateMutation.mutate();
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScreenGuard session={session} isLoading={isLoading || !data} loadingLabel="Loading dog...">
        <ScrollView contentContainerStyle={LAYOUT_STYLES.scrollScreenPadded}>
          <View className="gap-4">
            <Typography variant="h3">Edit Dog</Typography>

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

            <Button onPress={submit} loading={updateMutation.isPending}>
              {updateMutation.isPending ? STRINGS.common.pleaseWait : 'Save changes'}
            </Button>
          </View>
        </ScrollView>
      </ScreenGuard>
    </SafeAreaView>
  );
}
