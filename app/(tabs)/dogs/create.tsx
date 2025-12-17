import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

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
  const { ready, activeOrgId, bootstrap } = useSessionStore();
  const [form, setForm] = useState<DogFormState>({
    name: '',
    stage: STAGES[0],
    location: '',
    description: '',
    responsible_person: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!ready) bootstrap();
  }, [ready, bootstrap]);

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

  if (!ready) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface">
        <Text className="text-sm text-gray-600">Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!activeOrgId) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-base font-semibold text-gray-900">No active organization</Text>
        <Text className="mt-2 text-sm text-gray-600 text-center">
          Select an organization to create a dog record.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text className="text-xl font-bold text-gray-900 mb-4">Create Dog (Mock)</Text>
        <FormField
          label="Name"
          value={form.name}
          onChangeText={(name) => setForm((f) => ({ ...f, name }))}
          error={errors.name}
        />
        <FormField
          label="Stage"
          value={form.stage}
          onChangeText={(stage) => setForm((f) => ({ ...f, stage }))}
          helper={`Options: ${STAGES.join(', ')}`}
          error={errors.stage}
        />
        <FormField
          label="Location"
          value={form.location}
          onChangeText={(location) => setForm((f) => ({ ...f, location }))}
          error={errors.location}
        />
        <FormField
          label="Responsible Person"
          value={form.responsible_person ?? ''}
          onChangeText={(responsible_person) => setForm((f) => ({ ...f, responsible_person }))}
        />
        <FormField
          label="Description"
          multiline
          value={form.description}
          onChangeText={(description) => setForm((f) => ({ ...f, description }))}
          error={errors.description}
        />

        <Pressable
          onPress={submit}
          className="mt-4 bg-gray-900 rounded-md h-12 items-center justify-center">
          <Text className="text-sm font-semibold text-white">Save (mock)</Text>
        </Pressable>

        {submitted ? (
          <Text className="mt-3 text-sm text-green-600">
            Submitted (mock) — will be wired to Supabase later.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const FormField = ({
  label,
  helper,
  error,
  ...rest
}: {
  label: string;
  helper?: string;
  error?: string;
} & React.ComponentProps<typeof TextInput>) => (
  <View className="mb-4">
    <Text className="text-sm font-medium text-gray-800 mb-1">{label}</Text>
    <TextInput
      {...rest}
      className={`min-h-[44px] px-3 py-2 rounded-md border ${
        error ? 'border-red-400' : 'border-border'
      } bg-white text-gray-900`}
      placeholderTextColor="#9CA3AF"
    />
    {helper ? <Text className="text-xs text-gray-500 mt-1">{helper}</Text> : null}
    {error ? <Text className="text-xs text-red-600 mt-1">{error}</Text> : null}
  </View>
);
