import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { DataView } from '@/components/patterns/DataView';
import { OrgSelector } from '@/components/patterns/OrgSelector';
import { Pagination } from '@/components/patterns/Pagination';
import { ScreenGuard } from '@/components/patterns/ScreenGuard';
import { DataTable } from '@/components/table/DataTable';
import { TableCell } from '@/components/table/TableCell';
import { TableToolbar } from '@/components/table/TableToolbar';
import { MemberDetailDrawer, ContactDetailDrawer, ContactEditorDrawer } from '@/components/people/PeopleDrawers';
import type { ContactDraft, ContactRow, MemberRow } from '@/components/people/types';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Typography } from '@/components/ui/Typography';
import { useOrgContacts } from '@/hooks/useOrgContacts';
import { useOrgMemberships } from '@/hooks/useOrgMemberships';
import { adminLinkContactToUser, createOrgContact } from '@/lib/data/contacts';
import { inviteOrgMember } from '@/lib/data/invites';
import { getPagination } from '@/lib/pagination';
import { OrgContact } from '@/schemas/orgContact';
import { useSessionStore } from '@/stores/sessionStore';

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
  const session = useSessionStore();
  const { ready, memberships, activeOrgId, switchOrg } = session;
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
  const [contactDraft, setContactDraft] = useState<ContactDraft>({
    kind: 'person',
    display_name: '',
    email: '',
    phone: '',
    roles: [],
  });
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
    if (ready && activeOrgId) {
      refetch();
      refetchContacts();
    }
  }, [ready, activeOrgId, refetch, refetchContacts]);

  const isLoading = dataset === 'users' ? membersLoading : contactsLoading;
  const error = dataset === 'users' ? membersError : contactsError;

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

  const totalItems = rows.length;
  const pagination = useMemo(
    () => getPagination({ page, pageSize, totalItems }),
    [page, pageSize, totalItems]
  );
  const paginated = useMemo(
    () => rows.slice(pagination.start, pagination.start + pageSize),
    [rows, pagination.start, pageSize]
  );

  const headerActions: React.ReactElement[] = [];
  headerActions.push(
    <View key="dataset" className="flex-row gap-2">
      {[
        { label: 'Contacts', value: 'contacts' as const },
        { label: 'App users', value: 'users' as const },
      ].map((opt) => {
        const active = dataset === opt.value;
        return (
          <Button
            key={opt.value}
            variant={active ? 'primary' : 'outline'}
            size="sm"
            onPress={() => {
              setDataset(opt.value);
              setPage(1);
            }}>
            {opt.label}
          </Button>
        );
      })}
    </View>
  );

  if (dataset === 'contacts') {
    headerActions.push(
      <Button
        key="create"
        variant="primary"
        size="sm"
        onPress={() => {
          setContactDraft({ kind: 'person', display_name: '', email: '', phone: '', roles: [] });
          setContactEditorError(null);
          setContactEditorOpen(true);
        }}>
        Create contact
      </Button>
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
    <ScreenGuard session={session}>
      <View className="flex-1 bg-white">
        <PageHeader
          title="People & Homes"
          subtitle={dataset === 'users' ? 'App users (memberships)' : 'Contacts (including offline fosters/homes).'}
          actions={headerActions}
        />

        <TableToolbar
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          filters={
            dataset === 'users'
              ? [
                  { label: 'All users', value: 'all', active: userFilter === 'all', onPress: () => {
                      setUserFilter('all');
                      setPage(1);
                    } },
                  { label: 'Fosters', value: 'fosters', active: userFilter === 'fosters', onPress: () => {
                      setUserFilter('fosters');
                      setPage(1);
                    } },
                ]
              : [
                  { label: 'All', value: 'all', active: contactFilter === 'all', onPress: () => {
                      setContactFilter('all');
                      setPage(1);
                    } },
                  { label: 'Fosters', value: 'fosters', active: contactFilter === 'fosters', onPress: () => {
                      setContactFilter('fosters');
                      setPage(1);
                    } },
                  { label: 'Transporters', value: 'transporters', active: contactFilter === 'transporters', onPress: () => {
                      setContactFilter('transporters');
                      setPage(1);
                    } },
                  { label: 'Homes', value: 'homes', active: contactFilter === 'homes', onPress: () => {
                      setContactFilter('homes');
                      setPage(1);
                    } },
                  { label: 'Unlinked', value: 'unlinked', active: contactFilter === 'unlinked', onPress: () => {
                      setContactFilter('unlinked');
                      setPage(1);
                    } },
                ]
          }
        />

        <View className="flex-1 relative">
          <DataView
            data={paginated}
            isLoading={isLoading}
            error={error}
            isEmpty={() => rows.length === 0}
            loadingLabel="Loading..."
            emptyComponent={
              <View className="flex-1 items-center justify-center bg-surface">
                <EmptyState title={dataset === 'users' ? 'No users found.' : 'No contacts found.'} />
              </View>
            }>
            {(paged) =>
              dataset === 'users' ? (
                <DataTable<MemberRow>
                  columns={USER_COLUMNS}
                  data={paged as MemberRow[]}
                  minWidth={tableMinWidth(USER_COLUMNS)}
                  renderRow={({ item }) => (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setSelectedMemberId(item.id)}
                      className="flex-row items-center"
                      style={{ width: '100%' }}>
                      <TableCell flex={1.5} minWidth={200}>
                        <Typography variant="body" className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                          {item.name}
                        </Typography>
                      </TableCell>
                      <TableCell flex={1.5} minWidth={220}>
                        <Typography variant="bodySmall" className="text-xs text-gray-700" numberOfLines={1}>
                          {item.email}
                        </Typography>
                      </TableCell>
                      <TableCell flex={1.2} minWidth={200}>
                        <Typography variant="caption" className="text-[11px] text-gray-600" numberOfLines={1}>
                          {item.userId}
                        </Typography>
                      </TableCell>
                      <TableCell flex={1.2} minWidth={160}>
                        <Typography variant="bodySmall" className="text-xs text-gray-700" numberOfLines={1}>
                          {item.roles}
                        </Typography>
                      </TableCell>
                      <TableCell flex={0.8} minWidth={120}>
                        <Typography variant="bodySmall" className="text-xs font-semibold text-gray-800" numberOfLines={1}>
                          {item.status}
                        </Typography>
                      </TableCell>
                    </Pressable>
                  )}
                />
              ) : (
                <DataTable<ContactRow>
                  columns={CONTACT_COLUMNS}
                  data={paged as ContactRow[]}
                  minWidth={tableMinWidth(CONTACT_COLUMNS)}
                  renderRow={({ item }) => (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setSelectedContactId(item.id)}
                      className="flex-row items-center"
                      style={{ width: '100%' }}>
                      <TableCell flex={1.5} minWidth={220}>
                        <Typography variant="body" className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                          {item.name}
                        </Typography>
                      </TableCell>
                      <TableCell flex={0.9} minWidth={120}>
                        <Typography variant="bodySmall" className="text-xs text-gray-700" numberOfLines={1}>
                          {item.kind}
                        </Typography>
                      </TableCell>
                      <TableCell flex={1.4} minWidth={220}>
                        <Typography variant="bodySmall" className="text-xs text-gray-700" numberOfLines={1}>
                          {item.email || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell flex={1.1} minWidth={160}>
                        <Typography variant="caption" className="text-[11px] text-gray-600" numberOfLines={1}>
                          {item.phone || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell flex={1.2} minWidth={180}>
                        <Typography variant="bodySmall" className="text-xs text-gray-700" numberOfLines={1}>
                          {item.roles}
                        </Typography>
                      </TableCell>
                      <TableCell flex={0.8} minWidth={120}>
                        <Typography variant="bodySmall" className="text-xs font-semibold text-gray-800" numberOfLines={1}>
                          {item.linked}
                        </Typography>
                      </TableCell>
                    </Pressable>
                  )}
                />
              )
            }
          </DataView>
        </View>

        <Pagination
          page={pagination.pageSafe}
          pageSize={pageSize}
          totalItems={totalItems}
          onChangePage={setPage}
          onChangePageSize={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />

        <MemberDetailDrawer memberId={selectedMemberId} members={userRows} onClose={() => setSelectedMemberId(null)} />

        <ContactDetailDrawer
          contactId={selectedContactId}
          contacts={orgContacts ?? []}
          onClose={() => setSelectedContactId(null)}
          canAdmin={canAdminInvite}
          orgId={activeOrgId}
          onInvite={async (contact: OrgContact) => {
            if (!activeOrgId) return;
            if (!contact.email) throw new Error('Contact has no email.');
            await inviteOrgMember(activeOrgId, contact.email, contact.roles ?? [], contact.display_name);
            await refetch();
            await refetchContacts();
          }}
          onAdminLink={async (contact: OrgContact, userId: string) => {
            if (!activeOrgId) return;
            await adminLinkContactToUser(activeOrgId, contact.id, userId);
            await refetch();
            await refetchContacts();
          }}
        />

        <ContactEditorDrawer
          open={contactEditorOpen}
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
      </View>
    </ScreenGuard>
  );
}
 
