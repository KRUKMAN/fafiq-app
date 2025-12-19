import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Plus } from 'lucide-react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/table/DataTable';
import { TableToolbar } from '@/components/table/TableToolbar';
import { useOrgMemberships } from '@/hooks/useOrgMemberships';
import { useOrgContacts } from '@/hooks/useOrgContacts';
import OrgSelector from './OrgSelector';
import { useSessionStore } from '@/stores/sessionStore';
import { adminLinkContactToUser, createOrgContact } from '@/lib/data/contacts';
import { inviteOrgMember } from '@/lib/data/invites';
import { OrgContact } from '@/schemas/orgContact';

type MemberRow = {
  id: string;
  name: string;
  email: string;
  userId: string;
  roles: string;
  status: string;
};

type ContactRow = {
  id: string;
  kind: string;
  name: string;
  email: string;
  phone: string;
  roles: string;
  linked: string;
};

const USER_COLUMNS = [
  { key: 'name', label: 'Name', flex: 1.5, minWidth: 200 },
  { key: 'email', label: 'Email', flex: 1.5, minWidth: 220 },
  { key: 'userId', label: 'User ID', flex: 1.2, minWidth: 200 },
  { key: 'roles', label: 'Roles', flex: 1.2, minWidth: 160 },
  { key: 'status', label: 'Status', flex: 0.8, minWidth: 120 },
];

const CONTACT_COLUMNS = [
  { key: 'name', label: 'Name', flex: 1.5, minWidth: 220 },
  { key: 'kind', label: 'Kind', flex: 0.9, minWidth: 120 },
  { key: 'email', label: 'Email', flex: 1.4, minWidth: 220 },
  { key: 'phone', label: 'Phone', flex: 1.1, minWidth: 160 },
  { key: 'roles', label: 'Roles', flex: 1.2, minWidth: 180 },
  { key: 'linked', label: 'Linked', flex: 0.8, minWidth: 120 },
];

const tableMinWidth = (cols: { minWidth: number }[]) => cols.reduce((sum, col) => sum + col.minWidth, 0);

export default function PeopleScreen() {
  const { ready, memberships, activeOrgId, bootstrap, switchOrg } = useSessionStore();
  const [dataset, setDataset] = useState<'users' | 'contacts'>('contacts');
  const [userFilter, setUserFilter] = useState<'all' | 'fosters'>('all');
  const [contactFilter, setContactFilter] = useState<'all' | 'fosters' | 'transporters' | 'homes' | 'unlinked'>(
    'all'
  );
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contactEditorOpen, setContactEditorOpen] = useState(false);
  const [contactEditorError, setContactEditorError] = useState<string | null>(null);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactDraft, setContactDraft] = useState<{
    kind: 'person' | 'home';
    display_name: string;
    email: string;
    phone: string;
    roles: string[];
  }>({ kind: 'person', display_name: '', email: '', phone: '', roles: [] });
  const {
    data: orgMembers,
    isLoading: membersLoading,
    error: membersError,
    refetch,
  } = useOrgMemberships(activeOrgId ?? undefined);
  const {
    data: orgContacts,
    isLoading: contactsLoading,
    error: contactsError,
    refetch: refetchContacts,
  } = useOrgContacts(activeOrgId ?? undefined);

  const activeMembership =
    memberships.find((m) => m.org_id === activeOrgId && m.active) ?? memberships.find((m) => m.active) ?? null;
  const canAdminInvite = Boolean(activeMembership?.roles?.includes('admin'));

  useEffect(() => {
    if (!ready) {
      bootstrap();
    }
  }, [ready, bootstrap]);

  useEffect(() => {
    if (ready && activeOrgId) {
      refetch();
      refetchContacts();
    }
  }, [ready, activeOrgId, refetch, refetchContacts]);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator />
        <Text className="mt-2 text-sm text-gray-600">Loading session...</Text>
      </View>
    );
  }

  if (ready && memberships.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-base font-semibold text-gray-900">No memberships found</Text>
        <Text className="mt-2 text-sm text-gray-600 text-center">
          Join or create an organization to manage people and housing.
        </Text>
      </View>
    );
  }

  if (!activeOrgId) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-base font-semibold text-gray-900">No active organization</Text>
        <Text className="mt-2 text-sm text-gray-600 text-center">
          Select an organization to view people and housing data.
        </Text>
      </View>
    );
  }

  const isLoading = dataset === 'users' ? membersLoading : contactsLoading;
  const error = dataset === 'users' ? membersError : contactsError;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator />
        <Text className="mt-2 text-sm text-gray-600">Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-base font-semibold text-gray-900">Failed to load data</Text>
        <Text className="mt-2 text-sm text-gray-600 text-center">
          {(error as Error).message || 'Please try again shortly.'}
        </Text>
      </View>
    );
  }

  const userRows = useMemo<MemberRow[]>(() => {
    const list = (orgMembers ?? []).map((m) => ({
      id: m.id,
      name: m.user_name,
      email: m.user_email ?? 'email unavailable',
      userId: m.user_id,
      roles: m.roles.join(', ') || 'no roles',
      status: m.active ? 'active' : 'inactive',
      hasRole: {
        foster: m.roles.includes('foster'),
      },
    }));
    const filteredByMode = userFilter === 'fosters' ? list.filter((m) => m.hasRole.foster) : list;
    const term = search.trim().toLowerCase();
    const filtered = term
      ? filteredByMode.filter(
          (m) =>
            m.name.toLowerCase().includes(term) ||
            m.email.toLowerCase().includes(term) ||
            m.userId.toLowerCase().includes(term) ||
            m.roles.toLowerCase().includes(term)
        )
      : filteredByMode;
    return filtered.map(({ hasRole, ...rest }) => rest);
  }, [orgMembers, userFilter, search]);

  const contactRows = useMemo<ContactRow[]>(() => {
    const list = (orgContacts ?? []).map((c) => ({
      id: c.id,
      kind: c.kind,
      name: c.display_name,
      email: c.email ?? '',
      phone: c.phone ?? '',
      roles: (c.roles ?? []).join(', ') || 'no roles',
      linked: c.linked_user_id ? 'linked' : 'offline',
      hasRole: {
        foster: (c.roles ?? []).includes('foster'),
        transport: (c.roles ?? []).includes('transport'),
      },
    }));

    const filteredByMode =
      contactFilter === 'fosters'
        ? list.filter((c) => c.hasRole.foster)
        : contactFilter === 'transporters'
          ? list.filter((c) => c.hasRole.transport)
          : contactFilter === 'homes'
            ? list.filter((c) => c.kind === 'home')
            : contactFilter === 'unlinked'
              ? list.filter((c) => c.linked === 'offline')
              : list;

    const term = search.trim().toLowerCase();
    const filtered = term
      ? filteredByMode.filter(
          (c) =>
            c.name.toLowerCase().includes(term) ||
            c.email.toLowerCase().includes(term) ||
            c.phone.toLowerCase().includes(term) ||
            c.roles.toLowerCase().includes(term) ||
            c.kind.toLowerCase().includes(term)
        )
      : filteredByMode;

    return filtered.map(({ hasRole, ...rest }) => rest);
  }, [orgContacts, contactFilter, search]);

  const rows = dataset === 'users' ? userRows : contactRows;
  const columns = dataset === 'users' ? USER_COLUMNS : CONTACT_COLUMNS;
  const minWidth = tableMinWidth(columns);

  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const start = (pageSafe - 1) * pageSize;
  const paginated = rows.slice(start, start + pageSize);

  const headerActions: React.ReactElement[] = [];
  headerActions.push(
    <View key="dataset" className="flex-row gap-2">
      {[
        { label: 'Contacts', value: 'contacts' as const },
        { label: 'App users', value: 'users' as const },
      ].map((opt) => {
        const active = dataset === opt.value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            onPress={() => {
              setDataset(opt.value);
              setPage(1);
            }}
            className={`px-3 py-2 rounded-md border ${
              active ? 'bg-gray-900 border-gray-900' : 'bg-white border-border'
            }`}>
            <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-800'}`}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (dataset === 'contacts') {
    headerActions.push(
      <Pressable
        key="create"
        accessibilityRole="button"
        disabled={!activeOrgId}
        onPress={() => {
          setContactDraft({ kind: 'person', display_name: '', email: '', phone: '', roles: [] });
          setContactEditorError(null);
          setContactEditorOpen(true);
        }}
        className="px-3 py-2 rounded-md bg-gray-900 flex-row items-center gap-2">
        <Plus size={16} color="#fff" />
        <Text className="text-xs font-semibold text-white">Create contact</Text>
      </Pressable>
    );
  }

  headerActions.push(
    <OrgSelector
      key="org"
      activeOrgId={activeOrgId}
      memberships={memberships}
      switchOrg={switchOrg}
      ready={ready}
    />
  );

  return (
    <View className="flex-1 bg-white">
      <PageHeader
        title="People & Homes"
        subtitle={dataset === 'users' ? 'App users (memberships)' : 'Contacts (including offline fosters/homes).'}
        actions={headerActions}
      />

      <View className="px-6 pb-3 flex-row flex-wrap gap-2">
        {dataset === 'users'
          ? [
              { label: 'All users', value: 'all' as const },
              { label: 'Fosters', value: 'fosters' as const },
            ].map((opt) => {
              const active = userFilter === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  accessibilityRole="button"
                  onPress={() => {
                    setUserFilter(opt.value);
                    setPage(1);
                  }}
                  className={`px-3 py-2 rounded-md border ${
                    active ? 'bg-gray-900 border-gray-900' : 'bg-white border-border'
                  }`}>
                  <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-800'}`}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })
          : [
              { label: 'All', value: 'all' as const },
              { label: 'Fosters', value: 'fosters' as const },
              { label: 'Transporters', value: 'transporters' as const },
              { label: 'Homes', value: 'homes' as const },
              { label: 'Unlinked', value: 'unlinked' as const },
            ].map((opt) => {
              const active = contactFilter === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  accessibilityRole="button"
                  onPress={() => {
                    setContactFilter(opt.value);
                    setPage(1);
                  }}
                  className={`px-3 py-2 rounded-md border ${
                    active ? 'bg-gray-900 border-gray-900' : 'bg-white border-border'
                  }`}>
                  <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-800'}`}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
      </View>

      <TableToolbar
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        filters={[]}
      />

      <View className="flex-1 relative">
        {dataset === 'users' ? (
          <DataTable<MemberRow>
            columns={USER_COLUMNS}
            data={paginated as MemberRow[]}
            minWidth={tableMinWidth(USER_COLUMNS)}
            renderRow={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedMemberId(item.id)}
                className="flex-row items-center"
                style={{ width: '100%' }}>
                <Cell flex={1.5} minWidth={200}>
                  <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                    {item.name}
                  </Text>
                </Cell>
                <Cell flex={1.5} minWidth={220}>
                  <Text className="text-xs text-gray-700" numberOfLines={1}>
                    {item.email}
                  </Text>
                </Cell>
                <Cell flex={1.2} minWidth={200}>
                  <Text className="text-[11px] text-gray-600" numberOfLines={1}>
                    {item.userId}
                  </Text>
                </Cell>
                <Cell flex={1.2} minWidth={160}>
                  <Text className="text-xs text-gray-700" numberOfLines={1}>
                    {item.roles}
                  </Text>
                </Cell>
                <Cell flex={0.8} minWidth={120}>
                  <Text className="text-xs font-semibold text-gray-800" numberOfLines={1}>
                    {item.status}
                  </Text>
                </Cell>
              </Pressable>
            )}
          />
        ) : (
          <DataTable<ContactRow>
            columns={CONTACT_COLUMNS}
            data={paginated as ContactRow[]}
            minWidth={tableMinWidth(CONTACT_COLUMNS)}
            renderRow={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedContactId(item.id)}
                className="flex-row items-center"
                style={{ width: '100%' }}>
                <Cell flex={1.5} minWidth={220}>
                  <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                    {item.name}
                  </Text>
                </Cell>
                <Cell flex={0.9} minWidth={120}>
                  <Text className="text-xs text-gray-700" numberOfLines={1}>
                    {item.kind}
                  </Text>
                </Cell>
                <Cell flex={1.4} minWidth={220}>
                  <Text className="text-xs text-gray-700" numberOfLines={1}>
                    {item.email || '-'}
                  </Text>
                </Cell>
                <Cell flex={1.1} minWidth={160}>
                  <Text className="text-[11px] text-gray-600" numberOfLines={1}>
                    {item.phone || '-'}
                  </Text>
                </Cell>
                <Cell flex={1.2} minWidth={180}>
                  <Text className="text-xs text-gray-700" numberOfLines={1}>
                    {item.roles}
                  </Text>
                </Cell>
                <Cell flex={0.8} minWidth={120}>
                  <Text className="text-xs font-semibold text-gray-800" numberOfLines={1}>
                    {item.linked}
                  </Text>
                </Cell>
              </Pressable>
            )}
          />
        )}
      </View>

      <View className="border-t border-border px-6 py-3 bg-gray-50 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-sm text-gray-500">Rows per page:</Text>
          {[10, 25, 50].map((size) => {
            const active = pageSize === size;
            return (
              <Pressable
                key={size}
                accessibilityRole="button"
                onPress={() => {
                  setPageSize(size);
                  setPage(1);
                }}
                className={`px-2 py-1 rounded-md border ${
                  active ? 'bg-gray-900 border-gray-900' : 'bg-white border-border'
                }`}>
                <Text className={`text-sm ${active ? 'text-white font-semibold' : 'text-gray-700'}`}>{size}</Text>
              </Pressable>
            );
          })}
        </View>

        <View className="items-center">
          <Text className="text-sm text-gray-500">
            Page {pageSafe} of {totalPages}
          </Text>
          <Text className="text-xs text-gray-500 mt-1">
            Showing{' '}
            <Text className="font-medium text-gray-900">
              {paginated.length} / {rows.length}
            </Text>{' '}
            records
          </Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            disabled={pageSafe <= 1}
            onPress={() => setPage(Math.max(1, pageSafe - 1))}
            className={`px-3 py-1 border border-border bg-white rounded text-sm ${
              pageSafe <= 1 ? 'text-gray-400 opacity-60' : 'text-gray-600'
            }`}>
            <Text className="text-sm">Previous</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={pageSafe >= totalPages}
            onPress={() => setPage(Math.min(totalPages, pageSafe + 1))}
            className={`px-3 py-1 border border-border bg-white rounded text-sm ${
              pageSafe >= totalPages ? 'text-gray-400 opacity-60' : 'text-gray-600'
            }`}>
            <Text className="text-sm">Next</Text>
          </Pressable>
        </View>
      </View>

      <MemberDetailDrawer
        memberId={selectedMemberId}
        members={userRows}
        onClose={() => setSelectedMemberId(null)}
      />

      <ContactDetailDrawer
        contactId={selectedContactId}
        contacts={orgContacts ?? []}
        onClose={() => setSelectedContactId(null)}
        canAdmin={canAdminInvite}
        orgId={activeOrgId}
        onInvite={async (contact) => {
          if (!activeOrgId) return;
          if (!contact.email) throw new Error('Contact has no email.');
          await inviteOrgMember(activeOrgId, contact.email, contact.roles ?? [], contact.display_name);
          await refetch();
          await refetchContacts();
        }}
        onAdminLink={async (contact, userId) => {
          if (!activeOrgId) return;
          await adminLinkContactToUser(activeOrgId, contact.id, userId);
          await refetch();
          await refetchContacts();
        }}
      />

      {contactEditorOpen ? (
        <ContactEditorDrawer
          draft={contactDraft}
          setDraft={setContactDraft}
          error={contactEditorError}
          submitting={contactSubmitting}
          onClose={() => setContactEditorOpen(false)}
          onSubmit={async () => {
            if (!activeOrgId) return;
            setContactSubmitting(true);
            setContactEditorError(null);
            try {
              await createOrgContact({
                org_id: activeOrgId,
                kind: contactDraft.kind,
                display_name: contactDraft.display_name.trim(),
                email: contactDraft.email.trim() ? contactDraft.email.trim() : null,
                phone: contactDraft.phone.trim() ? contactDraft.phone.trim() : null,
                roles: contactDraft.roles,
              });
              await refetchContacts();
              setContactEditorOpen(false);
            } catch (e: any) {
              setContactEditorError(e?.message ?? 'Failed to create contact');
            } finally {
              setContactSubmitting(false);
            }
          }}
        />
      ) : null}
    </View>
  );
}

const Cell = ({
  children,
  flex,
  minWidth,
}: {
  children: React.ReactNode;
  flex: number;
  minWidth: number;
}) => (
  <View className="px-6 py-4" style={{ flex, minWidth }}>
    {children}
  </View>
);

const Drawer = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <View className="absolute inset-0 flex-row z-50" style={{ pointerEvents: 'box-none' }}>
    <Pressable accessibilityRole="button" className="flex-1" onPress={onClose} />
    <View className="ml-auto h-full w-full max-w-5xl bg-white border-l border-border shadow-2xl">{children}</View>
  </View>
);

const MemberDetailDrawer = ({
  memberId,
  members,
  onClose,
}: {
  memberId: string | null;
  members: MemberRow[];
  onClose: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<'Overview' | 'Contact' | 'Activity'>('Overview');
  const member = members.find((m) => m.id === memberId);
  if (!memberId || !member) return null;
  return (
    <Drawer onClose={onClose}>
      <ScrollView className="flex-1 bg-surface" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="bg-white border-b border-border px-4 md:px-8 py-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-semibold text-gray-500 tracking-[0.06em] uppercase">Member</Text>
              <Text className="text-xl font-bold text-gray-900">{member.name}</Text>
              <Text className="text-sm text-gray-500 mt-1">{member.email}</Text>
            </View>
            <View className="flex-row items-center gap-3">
              <Text className="text-xs px-2 py-1 rounded-full bg-gray-900 text-white">{member.status}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                className="w-9 h-9 items-center justify-center border border-border rounded-md bg-white">
                <Text className="text-lg text-gray-600">x</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View className="w-full max-w-5xl self-center px-4 md:px-8 py-6">
          <DrawerTabs
            tabs={['Overview', 'Contact', 'Activity']}
            active={activeTab}
            onChange={(tab) => setActiveTab(tab as any)}
            className="mb-6"
          />

          {activeTab === 'Overview' ? (
            <View className="flex-row flex-wrap gap-4 mb-6">
              <MemberCard label="User ID" value={member.userId} />
              <MemberCard label="Roles" value={member.roles || 'No roles'} />
              <MemberCard label="Status" value={member.status} />
            </View>
          ) : null}

          {activeTab === 'Contact' ? (
            <View className="bg-white border border-border rounded-lg shadow-sm p-4 gap-3">
              <Text className="text-sm font-semibold text-gray-900">Contact</Text>
              <DetailRow label="Name" value={member.name} />
              <DetailRow label="Email" value={member.email} />
              <DetailRow label="User ID" value={member.userId} />
            </View>
          ) : null}

          {activeTab === 'Activity' ? (
            <View className="bg-white border border-border rounded-lg shadow-sm p-4 gap-3">
              <Text className="text-sm font-semibold text-gray-900">Activity</Text>
              <Text className="text-sm text-gray-600">No activity yet.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Drawer>
  );
};

const ContactDetailDrawer = ({
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
}) => {
  const [inviting, setInviting] = useState(false);
  const [linking, setLinking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [linkUserId, setLinkUserId] = useState('');

  const contact = contacts.find((c) => c.id === contactId);
  if (!contactId || !contact) return null;
  return (
    <Drawer onClose={onClose}>
      <ScrollView className="flex-1 bg-surface" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="bg-white border-b border-border px-4 md:px-8 py-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-semibold text-gray-500 tracking-[0.06em] uppercase">Contact</Text>
              <Text className="text-xl font-bold text-gray-900">{contact.display_name}</Text>
              <Text className="text-sm text-gray-500 mt-1">
                {(contact.email ?? '').toString() || 'No email'}
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <Text className="text-xs px-2 py-1 rounded-full bg-gray-900 text-white">
                {contact.linked_user_id ? 'linked' : 'offline'}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                className="w-9 h-9 items-center justify-center border border-border rounded-md bg-white">
                <Text className="text-lg text-gray-600">x</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View className="w-full max-w-5xl self-center px-4 md:px-8 py-6">
          <View className="bg-white border border-border rounded-lg shadow-sm p-4 gap-3">
            <Text className="text-sm font-semibold text-gray-900">Details</Text>
            <DetailRow label="Kind" value={contact.kind} />
            <DetailRow label="Name" value={contact.display_name} />
            <DetailRow label="Email" value={(contact.email ?? '').toString() || '-'} />
            <DetailRow label="Phone" value={(contact.phone ?? '').toString() || '-'} />
            <DetailRow label="Roles" value={(contact.roles ?? []).join(', ') || '-'} />
            <DetailRow label="Linked user" value={contact.linked_user_id ?? '-'} />
          </View>

          {status ? <Text className="text-xs text-gray-600 mt-3">{status}</Text> : null}

          {canAdmin && orgId ? (
            <View className="bg-white border border-border rounded-lg shadow-sm p-4 gap-3 mt-4">
              <Text className="text-sm font-semibold text-gray-900">Admin actions</Text>
              <Pressable
                accessibilityRole="button"
                disabled={inviting || !contact.email}
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
                className={`px-4 py-2 rounded-md ${inviting || !contact.email ? 'bg-gray-200' : 'bg-gray-900'}`}>
                <Text className="text-sm font-semibold text-white">
                  {inviting ? 'Inviting...' : contact.email ? 'Invite by email' : 'No email to invite'}
                </Text>
              </Pressable>

              {!contact.linked_user_id ? (
                <View className="gap-2">
                  <Text className="text-xs text-gray-600">Link this contact to a user_id (auth.users.id)</Text>
                  <TextInput
                    value={linkUserId}
                    onChangeText={setLinkUserId}
                    placeholder="user uuid"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-base"
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={linking || !linkUserId.trim()}
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
                    className={`px-4 py-2 rounded-md ${linking || !linkUserId.trim() ? 'bg-gray-200' : 'bg-gray-900'}`}>
                    <Text className="text-sm font-semibold text-white">{linking ? 'Linking...' : 'Link to user'}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Drawer>
  );
};

const ContactEditorDrawer = ({
  draft,
  setDraft,
  error,
  submitting,
  onClose,
  onSubmit,
}: {
  draft: { kind: 'person' | 'home'; display_name: string; email: string; phone: string; roles: string[] };
  setDraft: React.Dispatch<
    React.SetStateAction<{ kind: 'person' | 'home'; display_name: string; email: string; phone: string; roles: string[] }>
  >;
  error: string | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}) => {
  const toggleRole = (role: string) => {
    setDraft((prev) => {
      const has = prev.roles.includes(role);
      return { ...prev, roles: has ? prev.roles.filter((r) => r !== role) : [...prev.roles, role] };
    });
  };

  return (
    <Drawer onClose={onClose}>
      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-gray-900">Create contact</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            className="px-3 py-1 rounded-md border border-border bg-white">
            <Text className="text-xs font-semibold text-gray-900">Close</Text>
          </Pressable>
        </View>

        {error ? <Text className="text-sm text-red-600">{error}</Text> : null}

        <View className="gap-2">
          <Text className="text-sm font-medium text-gray-800">Kind</Text>
          <View className="flex-row gap-2">
            {(['person', 'home'] as const).map((k) => {
              const active = draft.kind === k;
              return (
                <Pressable
                  key={k}
                  accessibilityRole="button"
                  onPress={() => setDraft((p) => ({ ...p, kind: k }))}
                  className={`px-3 py-2 rounded-md border ${
                    active ? 'bg-gray-900 border-gray-900' : 'bg-white border-border'
                  }`}>
                  <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-800'}`}>{k}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <InputField
          label="Display name"
          value={draft.display_name}
          onChangeText={(val) => setDraft((p) => ({ ...p, display_name: val }))}
          placeholder="Name (required)"
        />
        <InputField
          label="Email (optional)"
          value={draft.email}
          onChangeText={(val) => setDraft((p) => ({ ...p, email: val }))}
          placeholder="person@example.org"
        />
        <InputField
          label="Phone (optional)"
          value={draft.phone}
          onChangeText={(val) => setDraft((p) => ({ ...p, phone: val }))}
          placeholder="+1 555 123 456"
        />

        <View className="gap-2">
          <Text className="text-sm font-medium text-gray-800">Roles</Text>
          <View className="flex-row flex-wrap gap-2">
            {['volunteer', 'foster', 'transport', 'admin'].map((role) => {
              const active = draft.roles.includes(role);
              return (
                <Pressable
                  key={role}
                  accessibilityRole="button"
                  onPress={() => toggleRole(role)}
                  className={`px-3 py-2 rounded-md border ${
                    active ? 'bg-gray-900 border-gray-900' : 'bg-white border-border'
                  }`}>
                  <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-800'}`}>{role}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={submitting || !draft.display_name.trim()}
          onPress={onSubmit}
          className={`px-4 py-3 rounded-lg ${submitting ? 'bg-gray-400' : 'bg-gray-900'}`}>
          <Text className="text-center text-white text-sm font-semibold">
            {submitting ? 'Creating...' : 'Create contact'}
          </Text>
        </Pressable>
      </ScrollView>
    </Drawer>
  );
};

const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (val: string) => void;
  placeholder?: string;
}) => (
  <View className="gap-1">
    <Text className="text-sm font-medium text-gray-800">{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      className="border border-gray-300 rounded-lg px-3 py-2 text-base"
    />
  </View>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-row justify-between py-1">
    <Text className="text-sm text-gray-500">{label}</Text>
    <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const MemberCard = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-1 min-w-[180px] bg-white border border-border rounded-lg p-3 shadow-sm">
    <Text className="text-[11px] font-bold text-gray-400 tracking-[0.08em] uppercase">{label}</Text>
    <Text className="text-[13px] font-semibold text-gray-900 mt-1">{value}</Text>
  </View>
);

const DrawerTabs = ({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: readonly string[];
  active: string;
  onChange: (tab: string) => void;
  className?: string;
}) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    className={className}
    contentContainerStyle={{ gap: 16, paddingBottom: 12 }}>
    {tabs.map((tab) => (
      <Pressable key={tab} onPress={() => onChange(tab)}>
        <Text
          className={`pb-3 text-sm font-medium border-b-2 ${
            active === tab ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500'
          }`}>
          {tab}
        </Text>
      </Pressable>
    ))}
  </ScrollView>
);


