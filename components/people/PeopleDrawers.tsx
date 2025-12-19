import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { Drawer } from '@/components/patterns/Drawer';
import { TabBar } from '@/components/patterns/TabBar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { updateOrgContact } from '@/lib/data/contacts';
import { OrgContact } from '@/schemas/orgContact';

import type { ContactDraft, MemberRow } from './types';

const MEMBER_TABS = ['Overview', 'Contact', 'Activity'] as const;

export function MemberDetailDrawer({
  memberId,
  members,
  onClose,
}: {
  memberId: string | null;
  members: MemberRow[];
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<(typeof MEMBER_TABS)[number]>('Overview');
  const member = useMemo(() => members.find((m) => m.id === memberId) ?? null, [members, memberId]);

  if (!memberId || !member) return null;

  return (
    <Drawer open={true} onClose={onClose}>
      <ScrollView className="flex-1 bg-surface" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="bg-white border-b border-border px-4 md:px-8 py-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Typography variant="label" className="text-xs font-semibold text-gray-500 tracking-[0.06em]">
                Member
              </Typography>
              <Typography variant="h3" className="text-xl font-bold text-gray-900">
                {member.name}
              </Typography>
              <Typography variant="body" className="text-sm text-gray-500 mt-1">
                {member.email}
              </Typography>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="px-2 py-1 rounded-full bg-primary">
                <Typography variant="caption" className="text-white">
                  {member.status}
                </Typography>
              </View>
              <Button variant="outline" size="sm" onPress={onClose}>
                Close
              </Button>
            </View>
          </View>
        </View>

        <View className="w-full max-w-5xl self-center px-4 md:px-8 py-6">
          <TabBar tabs={MEMBER_TABS} active={activeTab} onChange={setActiveTab} className="mb-6" />

          {activeTab === 'Overview' ? (
            <View className="flex-row flex-wrap gap-4 mb-6">
              <KeyValueCard label="User ID" value={member.userId} />
              <KeyValueCard label="Roles" value={member.roles || 'No roles'} />
              <KeyValueCard label="Status" value={member.status} />
            </View>
          ) : null}

          {activeTab === 'Contact' ? (
            <View className="bg-white border border-border rounded-lg shadow-sm p-4 gap-3">
              <Typography className="text-sm font-semibold text-gray-900">Contact</Typography>
              <DetailRow label="Name" value={member.name} />
              <DetailRow label="Email" value={member.email} />
              <DetailRow label="User ID" value={member.userId} />
            </View>
          ) : null}

          {activeTab === 'Activity' ? (
            <View className="bg-white border border-border rounded-lg shadow-sm p-4 gap-3">
              <Typography className="text-sm font-semibold text-gray-900">Activity</Typography>
              <Typography color="muted">No activity yet.</Typography>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Drawer>
  );
}

export function ContactDetailDrawer({
  contactId,
  contacts,
  onClose,
  canAdmin,
  orgId,
  onInvite,
  onAdminLink,
}: {
  contactId: string | null;
  contacts: OrgContact[];
  onClose: () => void;
  canAdmin: boolean;
  orgId: string | null;
  onInvite: (contact: OrgContact) => Promise<void>;
  onAdminLink: (contact: OrgContact, userId: string) => Promise<void>;
}) {
  const [inviting, setInviting] = useState(false);
  const [linking, setLinking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [linkUserId, setLinkUserId] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    display_name: '',
    email: '',
    phone: '',
    roles: [] as string[],
  });
  const [editMessage, setEditMessage] = useState<string | null>(null);

  const contact = useMemo(() => contacts.find((c) => c.id === contactId) ?? null, [contacts, contactId]);

  useEffect(() => {
    if (!contact) return;
    setDraft({
      display_name: contact.display_name,
      email: (contact.email ?? '').toString(),
      phone: (contact.phone ?? '').toString(),
      roles: contact.roles ?? [],
    });
    setEditing(false);
    setEditMessage(null);
  }, [contact]);

  const toggleRole = (role: string) => {
    setDraft((prev) => {
      const has = prev.roles.includes(role);
      return { ...prev, roles: has ? prev.roles.filter((r) => r !== role) : [...prev.roles, role] };
    });
  };

  const handleSave = async () => {
    if (!contact || !orgId) return;
    setSaving(true);
    setEditMessage(null);
    try {
      await updateOrgContact(orgId, contact.id, {
        display_name: draft.display_name,
        email: draft.email,
        phone: draft.phone,
        roles: draft.roles,
      });
      setEditMessage('Contact updated.');
      setEditing(false);
    } catch (e: any) {
      setEditMessage(e?.message ?? 'Unable to update contact');
    } finally {
      setSaving(false);
    }
  };

  if (!contactId || !contact) return null;

  return (
    <Drawer open={true} onClose={onClose}>
      <ScrollView className="flex-1 bg-surface" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="bg-white border-b border-border px-4 md:px-8 py-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Typography variant="label" className="text-xs font-semibold text-gray-500 tracking-[0.06em]">
                Contact
              </Typography>
              <Typography variant="h3" className="text-xl font-bold text-gray-900">
                {editing ? draft.display_name : contact.display_name}
              </Typography>
              <Typography variant="body" className="text-sm text-gray-500 mt-1">
                {editing ? draft.email || 'No email' : (contact.email ?? '').toString() || 'No email'}
              </Typography>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="px-2 py-1 rounded-full bg-primary">
                <Typography variant="caption" className="text-white">
                  {contact.linked_user_id ? 'linked' : 'offline'}
                </Typography>
              </View>
              {editing ? (
                <>
                  <Button variant="primary" size="sm" onPress={handleSave} loading={saving}>
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onPress={() => setEditing(false)} disabled={saving}>
                    Cancel
                  </Button>
                </>
              ) : canAdmin ? (
                <Button variant="outline" size="sm" onPress={() => setEditing(true)}>
                  Edit
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onPress={onClose}>
                Close
              </Button>
            </View>
          </View>
        </View>

        <View className="w-full max-w-5xl self-center px-4 md:px-8 py-6">
          {editMessage ? <Typography variant="caption" className="text-gray-600 mb-2">{editMessage}</Typography> : null}

          <View className="bg-white border border-border rounded-lg shadow-sm p-4 gap-3">
            <Typography className="text-sm font-semibold text-gray-900">Details</Typography>

            {editing ? (
              <View className="gap-3">
                <Input
                  label="Display name"
                  value={draft.display_name}
                  onChangeText={(val) => setDraft((p) => ({ ...p, display_name: val }))}
                  placeholder="Name"
                />
                <Input
                  label="Email"
                  value={draft.email}
                  onChangeText={(val) => setDraft((p) => ({ ...p, email: val }))}
                  placeholder="person@example.org"
                />
                <Input
                  label="Phone"
                  value={draft.phone}
                  onChangeText={(val) => setDraft((p) => ({ ...p, phone: val }))}
                  placeholder="+1 555 123 456"
                />

                <View className="gap-2">
                  <Typography className="text-sm font-semibold text-gray-900">Roles</Typography>
                  <View className="flex-row flex-wrap gap-2">
                    {['admin', 'volunteer', 'foster', 'transport'].map((role) => {
                      const active = draft.roles.includes(role);
                      return (
                        <Pressable
                          key={role}
                          accessibilityRole="button"
                          onPress={() => toggleRole(role)}
                          className={`px-3 py-2 rounded-md border ${
                            active ? 'bg-primary border-primary' : 'bg-white border-border'
                          }`}>
                          <Typography className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-800'}`}>
                            {role}
                          </Typography>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            ) : (
              <>
                <DetailRow label="Kind" value={contact.kind} />
                <DetailRow label="Name" value={contact.display_name} />
                <DetailRow label="Email" value={(contact.email ?? '').toString() || '-'} />
                <DetailRow label="Phone" value={(contact.phone ?? '').toString() || '-'} />
                <DetailRow label="Roles" value={(contact.roles ?? []).join(', ') || '-'} />
                <DetailRow label="Linked user" value={contact.linked_user_id ?? '-'} />
              </>
            )}
          </View>

          {status ? <Typography variant="caption" className="text-gray-600 mt-3">{status}</Typography> : null}

          {canAdmin && orgId ? (
            <View className="bg-white border border-border rounded-lg shadow-sm p-4 gap-3 mt-4">
              <Typography className="text-sm font-semibold text-gray-900">Admin actions</Typography>

              <Button
                variant="primary"
                onPress={async () => {
                  setInviting(true);
                  setStatus(null);
                  try {
                    await onInvite(contact);
                    setStatus('Invite sent (or membership added if user already exists).');
                  } catch (e: any) {
                    setStatus(e?.message ?? 'Invite failed');
                  } finally {
                    setInviting(false);
                  }
                }}
                disabled={inviting || !contact.email}
                loading={inviting}>
                {contact.email ? 'Invite by email' : 'No email to invite'}
              </Button>

              {!contact.linked_user_id ? (
                <View className="gap-2">
                  <Typography variant="caption" className="text-xs text-gray-600">
                    Link this contact to a user_id (auth.users.id)
                  </Typography>
                  <TextInput
                    value={linkUserId}
                    onChangeText={setLinkUserId}
                    placeholder="user uuid"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-base"
                  />
                  <Button
                    variant="primary"
                    onPress={async () => {
                      setLinking(true);
                      setStatus(null);
                      try {
                        await onAdminLink(contact, linkUserId.trim());
                        setStatus('Linked contact to user.');
                        setLinkUserId('');
                      } catch (e: any) {
                        setStatus(e?.message ?? 'Link failed');
                      } finally {
                        setLinking(false);
                      }
                    }}
                    disabled={linking || !linkUserId.trim()}
                    loading={linking}>
                    Link to user
                  </Button>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Drawer>
  );
}

export function ContactEditorDrawer({
  open,
  draft,
  setDraft,
  error,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  draft: ContactDraft;
  setDraft: React.Dispatch<React.SetStateAction<ContactDraft>>;
  error: string | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}) {
  const toggleRole = (role: string) => {
    setDraft((prev) => {
      const has = prev.roles.includes(role);
      return { ...prev, roles: has ? prev.roles.filter((r) => r !== role) : [...prev.roles, role] };
    });
  };

  if (!open) return null;

  return (
    <Drawer open={true} onClose={onClose} widthClassName="max-w-md">
      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View className="flex-row items-center justify-between">
          <Typography variant="h3" className="text-lg font-semibold text-gray-900">
            Create contact
          </Typography>
          <Button variant="outline" size="sm" onPress={onClose}>
            Close
          </Button>
        </View>

        {error ? <Typography color="error">{error}</Typography> : null}

        <View className="gap-2">
          <Typography className="text-sm font-medium text-gray-800">Kind</Typography>
          <View className="flex-row gap-2">
            {(['person', 'home'] as const).map((k) => {
              const active = draft.kind === k;
              return (
                <Pressable
                  key={k}
                  accessibilityRole="button"
                  onPress={() => setDraft((p) => ({ ...p, kind: k }))}
                  className={`px-3 py-2 rounded-md border ${active ? 'bg-primary border-primary' : 'bg-white border-border'}`}>
                  <Typography className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-800'}`}>{k}</Typography>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Input
          label="Display name"
          value={draft.display_name}
          onChangeText={(val) => setDraft((p) => ({ ...p, display_name: val }))}
          placeholder="Name (required)"
        />
        <Input
          label="Email (optional)"
          value={draft.email}
          onChangeText={(val) => setDraft((p) => ({ ...p, email: val }))}
          placeholder="person@example.org"
        />
        <Input
          label="Phone (optional)"
          value={draft.phone}
          onChangeText={(val) => setDraft((p) => ({ ...p, phone: val }))}
          placeholder="+1 555 123 456"
        />

        <View className="gap-2">
          <Typography className="text-sm font-medium text-gray-800">Roles</Typography>
          <View className="flex-row flex-wrap gap-2">
            {['volunteer', 'foster', 'transport', 'admin'].map((role) => {
              const active = draft.roles.includes(role);
              return (
                <Pressable
                  key={role}
                  accessibilityRole="button"
                  onPress={() => toggleRole(role)}
                  className={`px-3 py-2 rounded-md border ${active ? 'bg-primary border-primary' : 'bg-white border-border'}`}>
                  <Typography className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-800'}`}>{role}</Typography>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button
          variant="primary"
          onPress={onSubmit}
          disabled={submitting || !draft.display_name.trim()}
          loading={submitting}>
          Create contact
        </Button>
      </ScrollView>
    </Drawer>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-1">
      <Typography className="text-sm text-gray-500">{label}</Typography>
      <Typography className="text-sm font-medium text-gray-900" numberOfLines={1}>
        {value}
      </Typography>
    </View>
  );
}

function KeyValueCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 min-w-[180px] bg-white border border-border rounded-lg p-3 shadow-sm">
      <Typography className="text-[11px] font-bold text-gray-400 tracking-[0.08em] uppercase">{label}</Typography>
      <Typography className="text-[13px] font-semibold text-gray-900 mt-1">{value}</Typography>
    </View>
  );
}


