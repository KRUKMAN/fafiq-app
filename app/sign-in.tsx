import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
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
          <Typography variant="h1" className="text-2xl font-bold text-gray-900">
            RescueOps
          </Typography>
          <Typography variant="body" color="muted" className="mt-2">
            {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
          </Typography>

          <View className="mt-8 space-y-4">
            {mode === 'signup' ? (
              <Input
                label="Full name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Full name"
                autoCapitalize="words"
              />
            ) : null}

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.org"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />

            {error ? <Typography variant="caption" color="error">{error}</Typography> : null}
            {info ? <Typography variant="caption" color="success">{info}</Typography> : null}

            <Button variant="primary" fullWidth onPress={onSubmit} disabled={submitting} loading={submitting} className="mt-2">
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>

            <View className="flex-row items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
                {mode === 'signin' ? "Don't have an account? Create one" : 'Have an account? Sign in'}
              </Button>

              <Link href="/" replace className="text-sm text-gray-600">
                Back to app
              </Link>
            </View>

            <View className="pt-2">
              <Button
                variant="ghost"
                size="sm"
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
                Forgot password? Send reset email
              </Button>
            </View>

            <View className="pt-4 border-t border-gray-200 space-y-3">
              <Typography variant="caption" color="muted">Need a quick demo?</Typography>
              <Button
                variant="outline"
                size="sm"
                onPress={async () => {
                  setError(null);
                  setSubmitting(true);
                  try {
                    await signInDemo();
                    router.replace('/');
                  } finally {
                    setSubmitting(false);
                  }
                }}>
                Use mock data
              </Button>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
