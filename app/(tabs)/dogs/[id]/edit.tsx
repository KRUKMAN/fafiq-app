import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { z } from 'zod';

import { ScreenGuard } from '@/components/patterns/ScreenGuard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { useDog } from '@/hooks/useDog';
import { useSessionStore } from '@/stores/sessionStore';

const dogFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  stage: z.string().min(1, 'Stage is required'),
  location: z.string().min(1, 'Location is required'),
  description: z.string().min(1, 'Description is required'),
  responsible_person: z.string().optional(),
});

type DogFormState = z.infer<typeof dogFormSchema>;

const STAGES = ['In Foster', 'Medical', 'Transport', 'Adopted'];

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

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name,
        stage: data.stage,
        location: data.location,
        description: data.description,
        responsible_person: data.extra_fields.responsible_person ?? '',
      });
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
      return;
    }
    setErrors({});
    Alert.alert('Mock submit', 'Dog updated (mock). Supabase wiring comes in Phase 2.');
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScreenGuard session={session} isLoading={isLoading || !data} loadingLabel="Loading dog...">
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Typography variant="h3" className="mb-4">
            Edit Dog (Mock)
          </Typography>

          <Input
            label="Name"
            value={form.name}
            onChangeText={(name) => setForm((f) => ({ ...f, name }))}
            error={errors.name}
          />

          <View className="h-4" />

          <Input
            label="Stage"
            value={form.stage}
            onChangeText={(stage) => setForm((f) => ({ ...f, stage }))}
            helper={`Options: ${STAGES.join(', ')}`}
            error={errors.stage}
          />

          <View className="h-4" />

          <Input
            label="Location"
            value={form.location}
            onChangeText={(location) => setForm((f) => ({ ...f, location }))}
            error={errors.location}
          />

          <View className="h-4" />

          <Input
            label="Responsible Person"
            value={form.responsible_person ?? ''}
            onChangeText={(responsible_person) => setForm((f) => ({ ...f, responsible_person }))}
          />

          <View className="h-4" />

          <Input
            label="Description"
            multiline
            value={form.description}
            onChangeText={(description) => setForm((f) => ({ ...f, description }))}
            error={errors.description}
            className="min-h-[100px]"
          />

          <Button onPress={submit} className="mt-4">
            Save changes (mock)
          </Button>
        </ScrollView>
      </ScreenGuard>
    </SafeAreaView>
  );
}
