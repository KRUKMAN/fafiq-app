import { X } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';

import { Drawer } from '@/components/patterns/Drawer';
import { ScreenGuard } from '@/components/patterns/ScreenGuard';
import { TabBar } from '@/components/patterns/TabBar';
import { Button } from '@/components/ui/Button';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { Typography } from '@/components/ui/Typography';
import { UI_COLORS } from '@/constants/uiColors';

export type StandardDetailLayoutProps = {
  // Drawer
  open: boolean;
  onClose: () => void;
  widthClassName?: string; // Default: "max-w-5xl"

  // Session & Guard
  session: {
    ready: boolean;
    bootstrap: () => void;
    memberships: any[];
    activeOrgId: string | null;
  };
  isLoading?: boolean;
  loadingLabel?: string;

  // Edit Banner (conditional, shown when editing)
  editBanner?: {
    visible: boolean;
    message?: string; // Default: "Editing details. Save or cancel to exit edit mode."
  };

  // Top Bar
  topBar: {
    title: string;
    subtitle?: string;
    onClose: () => void;
    accessory?: React.ReactNode; // e.g., avatar/initials
  };

  // Header (Highlight Panel)
  header: {
    photoUrl?: string | null;
    photoPlaceholder?: string; // Default: "No photo"
    primaryTitle: string;
    secondaryTitle?: string; // e.g., "Internal ID: 123"
    secondaryTitleStyle?: 'mono' | 'default'; // Default: 'mono'
    statusPill?: {
      label: string;
      icon?: React.ComponentType<{ size?: number; color?: string }>;
      variant?: 'default' | 'success' | 'warning' | 'destructive';
      onPress?: () => void; // Makes it interactive
    };
    actions: Array<{
      label: string;
      onPress: () => void;
      variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
      disabled?: boolean;
      loading?: boolean;
      leftIcon?: React.ReactNode;
    }>;
    actionStatus?: string | null; // e.g., photo upload status
  };

  // Key Metrics (Highlight Panel)
  metrics?: Array<{
    icon: React.ComponentType<{ size?: number; color?: string }>;
    label: string;
    value: string | number;
  }>;

  // Tabs
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabClassName?: string; // Default: "mb-8"

  // Tab Content Renderer
  renderTab: (tab: string) => React.ReactNode;

  // Edit Mode
  editing?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  saving?: boolean;
  saveError?: string | null;
  saveSuccess?: string | null;

  // Content Container
  contentMaxWidth?: string; // Default: "max-w-5xl"
  contentPadding?: {
    mobile?: string; // Default: "px-4"
    desktop?: string; // Default: "md:px-8"
  };
  contentMarginTop?: string; // Default: "mt-4"
};

export function StandardDetailLayout({
  open,
  onClose,
  widthClassName = 'max-w-5xl',
  session,
  isLoading = false,
  loadingLabel = 'Loading...',
  editBanner,
  topBar,
  header,
  metrics,
  tabs,
  activeTab,
  onTabChange,
  tabClassName = 'mb-8',
  renderTab,
  editing = false,
  onEdit,
  onSave,
  onCancel,
  saving = false,
  saveError,
  saveSuccess,
  contentMaxWidth = 'max-w-5xl',
  contentPadding = { mobile: 'px-4', desktop: 'md:px-8' },
  contentMarginTop = 'mt-4',
}: StandardDetailLayoutProps) {
  const StatusIcon = header.statusPill?.icon;

  return (
    <Drawer open={open} onClose={onClose} widthClassName={widthClassName}>
      <ScreenGuard session={session} isLoading={isLoading} loadingLabel={loadingLabel}>
        <View className="flex-1 bg-white">
          {/* Edit Banner (conditional, amber warning) - preserves UX polish */}
          {editBanner?.visible && (
            <View className="bg-amber-50 border-b border-amber-200 px-4 py-2">
              <Typography variant="caption" className="text-xs text-amber-800">
                {editBanner.message ?? 'Editing details. Save or cancel to exit edit mode.'}
              </Typography>
            </View>
          )}

          {/* TopBar with breadcrumb and close button - preserves UX polish */}
          <View className={`bg-white border-b border-border ${contentPadding.mobile} ${contentPadding.desktop} py-3 gap-3`}>
            <View className="flex-row items-center justify-between">
              <Typography variant="body" color="muted" className="text-sm font-medium">
                {topBar.title}
                {topBar.subtitle && (
                  <>
                    {' '}
                    <Typography variant="body" className="text-gray-900 font-semibold">
                      {topBar.subtitle}
                    </Typography>
                  </>
                )}
              </Typography>

              <View className="flex-row items-center gap-3">
                {topBar.accessory}
                <Pressable
                  accessibilityRole="button"
                  onPress={topBar.onClose}
                  className="w-9 h-9 items-center justify-center border border-border rounded-md bg-white">
                  <X size={18} color={UI_COLORS.muted} />
                </Pressable>
              </View>
            </View>
            <View className="h-1" />
          </View>

          {/* ScrollView with padding bottom - preserves UX polish */}
          <ScrollView className="flex-1 bg-surface" contentContainerStyle={{ paddingBottom: 32 }}>
            <View className={`w-full ${contentMaxWidth} self-center ${contentPadding.mobile} ${contentPadding.desktop} ${contentMarginTop}`}>
              {/* Header (responsive flex-col md:flex-row) - preserves UX polish */}
              <View className="flex-col md:flex-row justify-between gap-6 mb-8">
                <View className="flex-row gap-4">
                  {header.photoUrl ? (
                    <Image
                      source={{ uri: header.photoUrl }}
                      className="w-24 h-24 rounded-lg bg-gray-200 border border-border"
                    />
                  ) : (
                    <View className="w-24 h-24 rounded-lg bg-gray-200 border border-border items-center justify-center">
                      <Typography variant="caption" color="muted">
                        {header.photoPlaceholder ?? 'No photo'}
                      </Typography>
                    </View>
                  )}
                  <View className="justify-center">
                    <Typography variant="h1" className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
                      {header.primaryTitle}
                    </Typography>
                    {header.secondaryTitle && (
                      <Typography
                        variant="body"
                        color="muted"
                        className={`text-sm ${header.secondaryTitleStyle === 'mono' ? 'font-mono' : ''} mb-3`}>
                        {header.secondaryTitle}
                      </Typography>
                    )}
                    {header.statusPill && (
                      <Pressable
                        accessibilityRole="button"
                        onPress={header.statusPill.onPress}
                        className="flex-row items-center gap-2 bg-white border border-border py-1.5 px-3 rounded-full self-start">
                        {StatusIcon && <StatusIcon size={14} color={UI_COLORS.foreground} />}
                        <Typography variant="body" className="text-[13px] font-semibold text-gray-900">
                          {header.statusPill.label}
                        </Typography>
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Action buttons with flex-wrap - preserves UX polish */}
                <View className="flex-row flex-wrap gap-2">
                  {editing ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onPress={onSave}
                        disabled={saving}
                        loading={saving}>
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button variant="outline" size="sm" onPress={onCancel} disabled={saving}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      {onEdit && (
                        <Button variant="outline" size="sm" onPress={onEdit}>
                          Edit
                        </Button>
                      )}
                      {header.actions.map((action, idx) => (
                        <Button
                          key={idx}
                          variant={action.variant ?? 'outline'}
                          size="sm"
                          onPress={action.onPress}
                          disabled={action.disabled}
                          loading={action.loading}
                          leftIcon={action.leftIcon}>
                          {action.label}
                        </Button>
                      ))}
                    </>
                  )}
                </View>
              </View>

              {/* Photo status message below action buttons - preserves UX polish */}
              {header.actionStatus && (
                <Typography variant="caption" color="muted" className="text-xs mb-4">
                  {header.actionStatus}
                </Typography>
              )}

              {/* KeyMetrics grid (flex-row flex-wrap gap-4 mb-8) - preserves UX polish */}
              {metrics && metrics.length > 0 && (
                <View className="flex-row flex-wrap gap-4 mb-8">
                  {metrics.map((metric, idx) => {
                    const MetricIcon = metric.icon;
                    return (
                      <View
                        key={idx}
                        className="flex-1 min-w-[180px] flex-row items-center gap-3 bg-white border border-border rounded-lg p-3 shadow-sm">
                        <View className="w-9 h-9 items-center justify-center bg-surface rounded-md border border-gray-100">
                          <MetricIcon size={16} color={UI_COLORS.mutedForeground} />
                        </View>
                        <View className="flex-1">
                          <Typography
                            variant="label"
                            className="text-[11px] font-bold text-gray-400 tracking-[0.08em] uppercase">
                            {metric.label}
                          </Typography>
                          <Typography variant="body" className="text-[13px] font-semibold text-gray-900">
                            {metric.value}
                          </Typography>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* TabBar with spacing (mb-8) - preserves UX polish */}
              <TabBar tabs={tabs} active={activeTab} onChange={onTabChange} className={tabClassName} />

              {/* Save error below tabs, above content - preserves UX polish */}
              {saveError && (
                <Typography variant="caption" color="error" className="mb-2">
                  {saveError}
                </Typography>
              )}

              {/* Success message */}
              {saveSuccess && (
                <StatusMessage variant="success" message={saveSuccess} className="mb-2" />
              )}

              {/* Tab Content */}
              {renderTab(activeTab)}
            </View>
          </ScrollView>
        </View>
      </ScreenGuard>
    </Drawer>
  );
}

