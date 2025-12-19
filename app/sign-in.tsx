import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';

import { useSessionStore } from '@/stores/sessionStore';

export default function SignInScreen() {
  const router = useRouter();
  const { ready, isAuthenticated, bootstrap, signIn, signUp, signInDemo, resetPassword } = useSessionStore();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      bootstrap();
    }
  }, [ready, bootstrap]);

  useEffect(() => {
    if (ready && isAuthenticated) {
      router.replace('/');
    }
  }, [ready, isAuthenticated, router]);

  const onSubmit = async () => {
    if (!email || !password || (mode === 'signup' && !fullName)) {
      setError('Please fill all required fields.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        await signUp(fullName.trim(), email.trim(), password);
      }
      router.replace('/');
    } catch (err: any) {
      setError(err?.message ?? 'Unable to continue. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-6 py-8">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={64}>
        <View className="w-full max-w-md mx-auto">
          <Text className="text-2xl font-bold text-gray-900">RescueOps</Text>
          <Text className="mt-2 text-base text-gray-600">
            {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
          </Text>

          <View className="mt-8 space-y-4">
            {mode === 'signup' ? (
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Full name</Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Full name"
                  autoCapitalize="words"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-base"
                />
              </View>
            ) : null}

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.org"
                autoCapitalize="none"
                keyboardType="email-address"
                className="border border-gray-300 rounded-lg px-3 py-2 text-base"
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
              className="border border-gray-300 rounded-lg px-3 py-2 text-base"
            />
          </View>

            {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
            {info ? <Text className="text-sm text-green-700">{info}</Text> : null}

            <Pressable
              accessibilityRole="button"
              onPress={onSubmit}
              disabled={submitting}
              className={`mt-2 px-4 py-3 rounded-lg ${submitting ? 'bg-gray-400' : 'bg-gray-900'}`}>
              <Text className="text-center text-white text-sm font-semibold">
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </Text>
            </Pressable>

            <View className="flex-row items-center justify-between pt-2">
              <Pressable accessibilityRole="button" onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
                <Text className="text-sm text-gray-700 font-semibold">
                  {mode === 'signin' ? "Don't have an account? Create one" : 'Have an account? Sign in'}
                </Text>
              </Pressable>

              <Link href="/" replace className="text-sm text-gray-600">
                Back to app
              </Link>
            </View>

            <View className="pt-2">
              <Pressable
                accessibilityRole="button"
                disabled={submitting}
                onPress={async () => {
                  setError(null);
                  setInfo(null);
                  setSubmitting(true);
                  try {
                    await resetPassword(email);
                    setInfo('If this email exists, a reset link was sent.');
                  } catch (err: any) {
                    setError(err?.message ?? 'Unable to send reset email.');
                  } finally {
                    setSubmitting(false);
                  }
                }}>
                <Text className="text-xs text-gray-700 font-semibold">Forgot password? Send reset email</Text>
              </Pressable>
            </View>

            <View className="pt-4 border-t border-gray-200 space-y-3">
              <Text className="text-xs text-gray-500">Need a quick demo?</Text>
              <Pressable
                accessibilityRole="button"
                onPress={async () => {
                  setError(null);
                  setSubmitting(true);
                  try {
                    await signInDemo();
                    router.replace('/');
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-gray-50">
                <Text className="text-center text-sm font-semibold text-gray-800">Use mock data</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
