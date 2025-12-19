import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { useOrgInvites } from '@/hooks/useOrgInvites';
import { useOrgMemberships } from '@/hooks/useOrgMemberships';
import { cancelOrgInvite, inviteOrgMember } from '@/lib/data/invites';
import { downloadMyData, deleteMyAccount } from '@/lib/data/privacy';
import { fetchOrgById, updateOrgSettings } from '@/lib/data/orgs';
import { updateMembershipRoles } from '@/lib/data/memberships';
import { useSessionStore } from '@/stores/sessionStore';

const ROLE_OPTIONS = ['admin', 'volunteer', 'foster', 'transport'];

export default function SettingsScreen() {
  const { ready, activeOrgId, memberships: sessionMemberships, bootstrap, signOut } = useSessionStore();
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
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedMemberName, setSelectedMemberName] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleMessage, setRoleMessage] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [dogStagesText, setDogStagesText] = useState('');
  const [transportStatusesText, setTransportStatusesText] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportData, setExportData] = useState<string | null>(null);
  const [privacyMessage, setPrivacyMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const supabaseReady = useMemo(() => Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL), []);

  const { data: orgSettings, isLoading: orgSettingsLoading } = useQuery({
    queryKey: ['org-settings', activeOrgId ?? ''],
    queryFn: () => fetchOrgById(activeOrgId!),
    enabled: Boolean(activeOrgId),
    staleTime: 1000 * 60 * 5,
  });

  const activeMembership = useMemo(
    () => sessionMemberships.find((m) => m.org_id === activeOrgId),
    [sessionMemberships, activeOrgId]
  );
  const isAdmin = useMemo(() => Boolean(activeMembership?.roles?.includes('admin')), [activeMembership]);

  useEffect(() => {
    if (!ready) {
      bootstrap();
    }
  }, [ready, bootstrap]);

  useEffect(() => {
    if (orgSettings?.settings) {
      const dogStages = Array.isArray((orgSettings.settings as any).dog_stages)
        ? ((orgSettings.settings as any).dog_stages as string[])
        : [];
      const transportStatuses = Array.isArray((orgSettings.settings as any).transport_statuses)
        ? ((orgSettings.settings as any).transport_statuses as string[])
        : [];

      if (!dogStagesText) {
        setDogStagesText(dogStages.join(', '));
      }
      if (!transportStatusesText) {
        setTransportStatusesText(transportStatuses.join(', '));
      }
    }
  }, [orgSettings, dogStagesText, transportStatusesText]);

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

  const openRoleModal = (member: { id: string; user_name: string; roles: string[] }) => {
    setSelectedMemberId(member.id);
    setSelectedMemberName(member.user_name);
    setSelectedRoles(member.roles ?? []);
    setRoleError(null);
    setRoleMessage(null);
    setRoleModalOpen(true);
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  const handleSaveRoles = async () => {
    if (!activeOrgId || !selectedMemberId) return;
    setRoleSaving(true);
    setRoleError(null);
    setRoleMessage(null);
    try {
      await updateMembershipRoles(activeOrgId, selectedMemberId, selectedRoles);
      await refetch();
      setRoleMessage('Roles updated.');
      setRoleModalOpen(false);
    } catch (e: any) {
      setRoleError(e?.message ?? 'Unable to update roles.');
    } finally {
      setRoleSaving(false);
    }
  };

  const handleSaveOrgSettings = async () => {
    if (!activeOrgId) return;
    setSettingsSaving(true);
    setSettingsMessage(null);
    const dogStages = dogStagesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const transportStatuses = transportStatusesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await updateOrgSettings(activeOrgId, {
        ...(orgSettings?.settings ?? {}),
        dog_stages: dogStages,
        transport_statuses: transportStatuses,
      });
      setSettingsMessage('Organization fields saved.');
    } catch (e: any) {
      setSettingsMessage(e?.message ?? 'Unable to save settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleDownloadData = async () => {
    setExporting(true);
    setPrivacyMessage(null);
    try {
      const result = await downloadMyData();
      setExportData(JSON.stringify(result, null, 2));
      setPrivacyMessage('Download ready below.');
    } catch (e: any) {
      setPrivacyMessage(e?.message ?? 'Unable to download data.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setPrivacyMessage(null);
    try {
      await deleteMyAccount();
      setPrivacyMessage('Account deleted and anonymized. Signing out...');
      signOut();
    } catch (e: any) {
      setPrivacyMessage(e?.message ?? 'Unable to delete account.');
    } finally {
      setDeleting(false);
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
              <View className="items-end gap-1">
                <Text className="text-xs text-gray-700">{m.roles.join(', ') || 'no roles'}</Text>
                {isAdmin ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openRoleModal(m)}
                    disabled={!supabaseReady}
                    className={`px-2 py-1 rounded-md border ${
                      supabaseReady ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-100'
                    }`}>
                    <Text className="text-[11px] font-semibold text-gray-800">Edit roles</Text>
                  </Pressable>
                ) : null}
              </View>
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

      <View className="mb-6">
        <Text className="text-base font-semibold text-gray-900 mb-2">Organization fields</Text>
        <Text className="text-xs text-gray-600 mb-3">
          Configure picklists for dogs and transports. Values are stored per org in `orgs.settings`.
        </Text>
        {orgSettingsLoading ? <Text className="text-sm text-gray-600">Loading fields...</Text> : null}
        <View className="space-y-3">
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Dog stages (comma-separated)</Text>
            <TextInput
              value={dogStagesText}
              onChangeText={setDogStagesText}
              placeholder="Intake, In Foster, Medical, Transport, Adopted"
              autoCapitalize="none"
              className="border border-gray-300 rounded-lg px-3 py-2 text-base"
            />
          </View>
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Transport statuses (comma-separated)</Text>
            <TextInput
              value={transportStatusesText}
              onChangeText={setTransportStatusesText}
              placeholder="Requested, Scheduled, In Progress, Done, Canceled"
              autoCapitalize="none"
              className="border border-gray-300 rounded-lg px-3 py-2 text-base"
            />
          </View>
          {settingsMessage ? <Text className="text-sm text-gray-700">{settingsMessage}</Text> : null}
          <Pressable
            accessibilityRole="button"
            onPress={handleSaveOrgSettings}
            disabled={settingsSaving || !isAdmin || !supabaseReady}
            className={`px-4 py-3 rounded-lg ${
              settingsSaving || !isAdmin || !supabaseReady ? 'bg-gray-300' : 'bg-gray-900'
            }`}>
            <Text className="text-center text-white text-sm font-semibold">
              {settingsSaving ? 'Saving...' : 'Save fields'}
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="mb-6">
        <Text className="text-base font-semibold text-gray-900 mb-2">Privacy & Account</Text>
        <Text className="text-xs text-gray-600 mb-3">Export your data or request a soft delete.</Text>
        {privacyMessage ? <Text className="text-sm text-gray-700 mb-2">{privacyMessage}</Text> : null}
        <View className="flex-row gap-3 mb-3">
          <Pressable
            accessibilityRole="button"
            onPress={handleDownloadData}
            disabled={exporting || !supabaseReady}
            className={`px-4 py-3 rounded-lg ${exporting || !supabaseReady ? 'bg-gray-300' : 'bg-gray-900'}`}>
            <Text className="text-center text-white text-sm font-semibold">
              {exporting ? 'Preparing...' : 'Download my data'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={handleDeleteAccount}
            disabled={deleting || !supabaseReady}
            className={`px-4 py-3 rounded-lg ${deleting || !supabaseReady ? 'bg-gray-200' : 'bg-red-100'}`}>
            <Text className="text-center text-red-700 text-sm font-semibold">
              {deleting ? 'Deleting...' : 'Delete my account'}
            </Text>
          </Pressable>
        </View>
        {exportData ? (
          <View className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <Text className="text-[11px] font-mono text-gray-800" selectable>
              {exportData}
            </Text>
          </View>
        ) : null}
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

      <Modal visible={roleModalOpen} transparent animationType="fade" onRequestClose={() => setRoleModalOpen(false)}>
        <View className="flex-1 bg-black/40 justify-center items-center px-4">
          <View className="w-full max-w-md bg-white rounded-lg p-4 border border-border">
            <Text className="text-base font-semibold text-gray-900 mb-1">
              Edit roles {selectedMemberName ? `for ${selectedMemberName}` : ''}
            </Text>
            <Text className="text-xs text-gray-600 mb-3">Select the roles that apply to this member.</Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {ROLE_OPTIONS.map((role) => {
                const active = selectedRoles.includes(role);
                return (
                  <Pressable
                    key={role}
                    onPress={() => toggleRole(role)}
                    className={`px-3 py-2 rounded-md border ${
                      active ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'
                    }`}>
                    <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-800'}`}>{role}</Text>
                  </Pressable>
                );
              })}
            </View>
            {roleError ? <Text className="text-xs text-red-600 mb-2">{roleError}</Text> : null}
            {roleMessage ? <Text className="text-xs text-green-700 mb-2">{roleMessage}</Text> : null}
            <View className="flex-row justify-end gap-2">
              <Pressable
                accessibilityRole="button"
                onPress={() => setRoleModalOpen(false)}
                className="px-4 py-2 rounded-md border border-gray-300 bg-white">
                <Text className="text-sm font-semibold text-gray-800">Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleSaveRoles}
                disabled={roleSaving || !supabaseReady}
                className={`px-4 py-2 rounded-md ${
                  roleSaving || !supabaseReady ? 'bg-gray-300' : 'bg-gray-900'
                }`}>
                <Text className="text-sm font-semibold text-white">{roleSaving ? 'Saving...' : 'Save roles'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
