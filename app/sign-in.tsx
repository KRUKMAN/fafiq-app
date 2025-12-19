import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { STRINGS } from '@/constants/strings';
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
      setError(STRINGS.auth.missingFieldsError);
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
      setError(err?.message ?? STRINGS.auth.genericContinueError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background px-6 py-8">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={64}>
        <View className="w-full max-w-md mx-auto">
          <Typography variant="h1" className="text-2xl font-bold">
            {STRINGS.auth.appName}
          </Typography>
          <Typography variant="body" color="muted" className="mt-2">
            {mode === 'signin' ? STRINGS.auth.signInTitle : STRINGS.auth.signUpTitle}
          </Typography>

          <View className="mt-8 gap-4">
            {mode === 'signup' ? (
              <Input
                label={STRINGS.auth.fullNameLabel}
                value={fullName}
                onChangeText={setFullName}
                placeholder={STRINGS.auth.fullNamePlaceholder}
                autoCapitalize="words"
              />
            ) : null}

            <Input
              label={STRINGS.auth.emailLabel}
              value={email}
              onChangeText={setEmail}
              placeholder={STRINGS.auth.emailPlaceholder}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Input
              label={STRINGS.auth.passwordLabel}
              value={password}
              onChangeText={setPassword}
              placeholder={STRINGS.auth.passwordPlaceholder}
              secureTextEntry
            />

            {error ? <Typography variant="caption" color="error">{error}</Typography> : null}
            {info ? <Typography variant="caption" color="success">{info}</Typography> : null}

            <Button variant="primary" fullWidth onPress={onSubmit} disabled={submitting} loading={submitting} className="mt-2">
              {mode === 'signin' ? STRINGS.auth.ctaSignIn : STRINGS.auth.ctaCreateAccount}
            </Button>

            <View className="flex-row items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
                {mode === 'signin' ? STRINGS.auth.toggleToSignUp : STRINGS.auth.toggleToSignIn}
              </Button>

              <Link href="/" replace className="text-sm text-muted">
                {STRINGS.auth.backToApp}
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
                    setInfo(STRINGS.auth.resetEmailSent);
                  } catch (err: any) {
                    setError(err?.message ?? STRINGS.auth.resetEmailFailed);
                  } finally {
                    setSubmitting(false);
                  }
                }}>
                {STRINGS.auth.forgotPassword}
              </Button>
            </View>

            <View className="pt-4 border-t border-border gap-3">
              <Typography variant="caption" color="muted">
                {STRINGS.auth.demoHeading}
              </Typography>
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
                {STRINGS.auth.demoCta}
              </Button>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
