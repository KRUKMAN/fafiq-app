import React, { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { ScreenGuard } from '@/components/patterns/ScreenGuard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
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
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    const result = dogFormSchema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0];
        if (typeof path === 'string') errs[path] = issue.message;
      });
      setErrors(errs);
      setSubmitted(false);
      return;
    }
    setErrors({});
    setSubmitted(true);
    Alert.alert('Mock submit', 'Dog saved (mock). This will be wired to Supabase in Phase 2.');
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScreenGuard session={session} loadingLabel="Loading create form...">
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Typography variant="h3" className="mb-4">
            Create Dog (Mock)
          </Typography>

          <Input
            label="Name"
            value={form.name}
            onChangeText={(name) => setForm((f) => ({ ...f, name }))}
            error={errors.name}
            placeholder="Dog name"
          />

          <View className="h-4" />

          <Input
            label="Stage"
            value={form.stage}
            onChangeText={(stage) => setForm((f) => ({ ...f, stage }))}
            helper={`Options: ${STAGES.join(', ')}`}
            error={errors.stage}
            placeholder="In Foster, Medical..."
          />

          <View className="h-4" />

          <Input
            label="Location"
            value={form.location}
            onChangeText={(location) => setForm((f) => ({ ...f, location }))}
            error={errors.location}
            placeholder="City / region"
          />

          <View className="h-4" />

          <Input
            label="Responsible Person"
            value={form.responsible_person ?? ''}
            onChangeText={(responsible_person) => setForm((f) => ({ ...f, responsible_person }))}
            placeholder="Optional"
          />

          <View className="h-4" />

          <Input
            label="Description"
            multiline
            value={form.description}
            onChangeText={(description) => setForm((f) => ({ ...f, description }))}
            error={errors.description}
            placeholder="Personality, behavior, background"
            className="min-h-[100px]"
          />

          <Button onPress={submit} className="mt-4">
            Save (mock)
          </Button>

          {submitted ? (
            <Typography className="mt-3 text-sm text-green-600">
              Submitted (mock) — will be wired to Supabase later.
            </Typography>
          ) : null}
        </ScrollView>
      </ScreenGuard>
    </SafeAreaView>
  );
}
