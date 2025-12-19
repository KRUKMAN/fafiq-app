import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useOrgInvites } from '@/hooks/useOrgInvites';
import { useOrgMemberships } from '@/hooks/useOrgMemberships';
import { cancelOrgInvite, inviteOrgMember } from '@/lib/data/invites';
import { useSessionStore } from '@/stores/sessionStore';

export default function SettingsScreen() {
  const { ready, activeOrgId, memberships: sessionMemberships, bootstrap } = useSessionStore();
  const { data: memberships, isLoading, error, refetch } = useOrgMemberships(activeOrgId ?? undefined);
  const { data: invites, isLoading: invitesLoading, error: invitesError, refetch: refetchInvites } = useOrgInvites(
    activeOrgId ?? undefined
  );
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [rolesText, setRolesText] = useState('admin');
  const [submitting, setSubmitting] = useState(false);
  const [inviteActionId, setInviteActionId] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const supabaseReady = useMemo(() => Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL), []);

  useEffect(() => {
    if (!ready) {
      bootstrap();
    }
  }, [ready, bootstrap]);

  const handleInvite = async () => {
    if (!activeOrgId) return;
    if (!email || !rolesText) {
      setFormError('Email and roles are required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      const roles = rolesText
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);
      if (roles.length === 0) {
        setFormError('Provide at least one role.');
        return;
      }
      const response = await inviteOrgMember(activeOrgId, email.trim(), roles, fullName.trim() || undefined);
      setFormSuccess(
        response.status === 'pending'
          ? 'Invite recorded. The user will be added when they sign up.'
          : 'Member added to the org.'
      );
      await refetch();
      await refetchInvites();
      setEmail('');
      setFullName('');
    } catch (e: any) {
      setFormError(e?.message ?? 'Unable to send invite.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendInvite = async (inviteId: string, inviteEmail: string, roles: string[]) => {
    if (!activeOrgId) return;
    setInviteActionId(inviteId);
    setFormError(null);
    setFormSuccess(null);
    try {
      await inviteOrgMember(activeOrgId, inviteEmail, roles);
      await refetchInvites();
      setFormSuccess('Invite resent.');
    } catch (e: any) {
      setFormError(e?.message ?? 'Unable to resend invite.');
    } finally {
      setInviteActionId(null);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!activeOrgId) return;
    setInviteActionId(inviteId);
    setFormError(null);
    setFormSuccess(null);
    try {
      await cancelOrgInvite(activeOrgId, inviteId);
      await refetchInvites();
      setFormSuccess('Invite canceled.');
    } catch (e: any) {
      setFormError(e?.message ?? 'Unable to cancel invite.');
    } finally {
      setInviteActionId(null);
    }
  };

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
        <Text className="mt-2 text-sm text-gray-600">Loading session...</Text>
      </View>
    );
  }

  if (ready && sessionMemberships.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-base font-semibold text-gray-900">No memberships found</Text>
        <Text className="mt-2 text-sm text-gray-600 text-center">Join or create an organization to manage settings.</Text>
      </View>
    );
  }

  if (!activeOrgId) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-base font-semibold text-gray-900">No active organization</Text>
        <Text className="mt-2 text-sm text-gray-600 text-center">Select an organization to manage settings.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white px-4 py-6">
      <Text className="text-xl font-bold text-gray-900 mb-2">Organization Settings</Text>
      <Text className="text-sm text-gray-600 mb-4">
        Manage memberships for the active organization. Invite by email; existing users are added immediately, otherwise
        the invite is stored until they sign up.
      </Text>

      {supabaseReady ? null : (
        <View className="p-3 border border-amber-300 bg-amber-50 rounded-md mb-4">
          <Text className="text-sm text-amber-800">
            Supabase env not configured; membership changes will not persist. Configure env to enable invites.
          </Text>
        </View>
      )}

      <View className="mb-6">
        <Text className="text-base font-semibold text-gray-900 mb-2">Members</Text>
        {isLoading ? <Text className="text-sm text-gray-600">Loading...</Text> : null}
        {error ? <Text className="text-sm text-red-600">Error: {(error as Error).message}</Text> : null}
        {!isLoading && memberships && memberships.length === 0 ? (
          <Text className="text-sm text-gray-600">No members yet.</Text>
        ) : null}
        <View className="space-y-2">
          {memberships?.map((m) => (
            <View
              key={m.id}
              className="border border-gray-200 rounded-lg px-3 py-2 flex-row justify-between items-center">
              <View>
                <Text className="text-sm font-semibold text-gray-900">{m.user_name}</Text>
                <Text className="text-xs text-gray-600">{m.user_email ?? 'email unavailable'}</Text>
                <Text className="text-[11px] text-gray-500">user_id: {m.user_id}</Text>
              </View>
              <Text className="text-xs text-gray-700">{m.roles.join(', ') || 'no roles'}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="mb-6">
        <Text className="text-base font-semibold text-gray-900 mb-2">Invites</Text>
        {invitesLoading ? <Text className="text-sm text-gray-600">Loading invites...</Text> : null}
        {invitesError ? <Text className="text-sm text-red-600">Error: {(invitesError as Error).message}</Text> : null}
        {!invitesLoading && invites && invites.length === 0 ? (
          <Text className="text-sm text-gray-600">No invites yet.</Text>
        ) : null}
        <View className="space-y-3">
          {invites?.map((inv) => (
            <View
              key={inv.id}
              className="border border-gray-200 rounded-lg px-3 py-2">
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900">{inv.full_name ?? inv.email}</Text>
                  <Text className="text-xs text-gray-600">{inv.email}</Text>
                  <Text className="text-[11px] text-gray-500">status: {inv.status}</Text>
                </View>
                <Text className="text-xs text-gray-700 ml-3">{inv.roles.join(', ') || 'no roles'}</Text>
              </View>
              {inv.status === 'pending' ? (
                <View className="flex-row gap-2 mt-2">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleResendInvite(inv.id, inv.email, inv.roles)}
                    disabled={inviteActionId === inv.id || submitting || !supabaseReady}
                    className={`px-3 py-2 rounded-md border ${
                      inviteActionId === inv.id || submitting || !supabaseReady ? 'border-gray-300 bg-gray-100' : 'border-gray-300 bg-white'
                    }`}>
                    <Text className="text-xs font-semibold text-gray-800">
                      {inviteActionId === inv.id ? 'Working...' : 'Resend'}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleCancelInvite(inv.id)}
                    disabled={inviteActionId === inv.id || submitting || !supabaseReady}
                    className={`px-3 py-2 rounded-md ${
                      inviteActionId === inv.id || submitting || !supabaseReady ? 'bg-gray-200' : 'bg-red-100'
                    }`}>
                    <Text className="text-xs font-semibold text-red-700">
                      {inviteActionId === inv.id ? 'Working...' : 'Cancel'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </View>

      <View className="p-4 border border-gray-200 rounded-lg">
        <Text className="text-base font-semibold text-gray-900 mb-2">Invite member (by email)</Text>
        <Text className="text-xs text-gray-600 mb-3">
          Existing users are added immediately; others will be added when they sign up. Roles are comma-separated (e.g.,
          admin,volunteer).
        </Text>
        <View className="space-y-3">
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              className="border border-gray-300 rounded-lg px-3 py-2 text-base"
            />
          </View>
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Full name (optional)</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Full name"
              autoCapitalize="none"
              className="border border-gray-300 rounded-lg px-3 py-2 text-base"
            />
          </View>
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Roles</Text>
            <TextInput
              value={rolesText}
              onChangeText={setRolesText}
              placeholder="admin,volunteer"
              autoCapitalize="none"
              className="border border-gray-300 rounded-lg px-3 py-2 text-base"
            />
          </View>
          {formError ? <Text className="text-sm text-red-600">{formError}</Text> : null}
          {formSuccess ? <Text className="text-sm text-green-700">{formSuccess}</Text> : null}
          <Pressable
            accessibilityRole="button"
            onPress={handleInvite}
            disabled={submitting || !supabaseReady || !activeOrgId}
            className={`px-4 py-3 rounded-lg ${submitting || !supabaseReady || !activeOrgId ? 'bg-gray-300' : 'bg-gray-900'}`}>
            <Text className="text-center text-white text-sm font-semibold">
              {submitting ? 'Sending...' : 'Send invite'}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
