import React from 'react';
import { ScrollView, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenGuard } from '@/components/patterns/ScreenGuard';
import { Button } from '@/components/ui/Button';
import { StatusMessage } from '@/components/ui/StatusMessage';

export type StandardFormLayoutProps = {
  // Session & Guard
  session: {
    ready: boolean;
    bootstrap: () => void;
    memberships: any[];
    activeOrgId: string | null;
  };
  isLoading?: boolean;
  loadingLabel?: string;

  // Form State
  editing?: boolean; // true = edit mode, false/undefined = create mode
  saving?: boolean;
  saveError?: string | null;
  saveSuccess?: string | null;

  // Actions
  onSave: () => void | Promise<void>;
  onCancel?: () => void;

  // Validation
  isValid?: boolean;
  validationErrors?: Record<string, string>;
  showValidationErrors?: boolean; // Default: true

  // Form Content
  title?: string;
  subtitle?: string;
  showHeader?: boolean; // Default: true if title provided
  children: React.ReactNode;

  // Footer Configuration
  saveLabel?: string; // Default: "Save" or "Create"
  cancelLabel?: string; // Default: "Cancel"
  showCancel?: boolean; // Default: true
  footerPosition?: 'fixed' | 'inline'; // Default: 'inline'
  footerClassName?: string;

  // Layout
  maxWidth?: string; // Default: "max-w-2xl"
  containerPadding?: string; // Default: "px-6 py-6"
  contentGap?: string; // Default: "gap-6"
};

export function StandardFormLayout({
  session,
  isLoading = false,
  loadingLabel = 'Loading...',
  editing = false,
  saving = false,
  saveError,
  saveSuccess,
  onSave,
  onCancel,
  isValid = true,
  validationErrors = {},
  showValidationErrors = true,
  title,
  subtitle,
  showHeader,
  children,
  saveLabel,
  cancelLabel = 'Cancel',
  showCancel = true,
  footerPosition = 'inline',
  footerClassName,
  maxWidth = 'max-w-2xl',
  containerPadding = 'px-6 py-6',
  contentGap = 'gap-6',
}: StandardFormLayoutProps) {
  const defaultSaveLabel = editing ? 'Save' : 'Create';
  const shouldShowHeader = showHeader ?? (title !== undefined);

  return (
    <ScreenGuard session={session} isLoading={isLoading} loadingLabel={loadingLabel}>
      <View className="flex-1 bg-background">
        {shouldShowHeader && <PageHeader title={title ?? ''} subtitle={subtitle} />}

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
          <View className={`${maxWidth} self-center w-full ${containerPadding}`}>
            <View className={contentGap}>
              {children}

              {/* Validation Errors */}
              {showValidationErrors && Object.keys(validationErrors).length > 0 && (
                <View className="gap-2">
                  {Object.entries(validationErrors).map(([field, error]) => (
                    <StatusMessage key={field} variant="error" message={error} />
                  ))}
                </View>
              )}

              {/* Save Error */}
              {saveError && <StatusMessage variant="error" message={saveError} />}

              {/* Save Success */}
              {saveSuccess && <StatusMessage variant="success" message={saveSuccess} />}

              {/* Footer (inline by default) */}
              {footerPosition === 'inline' && (
                <View className={`flex-row justify-end gap-3 pt-4 ${footerClassName ?? ''}`}>
                  {showCancel && onCancel && (
                    <Button variant="outline" onPress={onCancel} disabled={saving}>
                      {cancelLabel}
                    </Button>
                  )}
                  <Button variant="primary" onPress={onSave} disabled={!isValid || saving} loading={saving}>
                    {saveLabel ?? defaultSaveLabel}
                  </Button>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Footer (fixed at bottom) */}
        {footerPosition === 'fixed' && (
          <View className={`border-t border-border bg-card px-6 py-4 ${footerClassName ?? ''}`}>
            <View className="flex-row justify-end gap-3">
              {showCancel && onCancel && (
                <Button variant="outline" onPress={onCancel} disabled={saving}>
                  {cancelLabel}
                </Button>
              )}
              <Button variant="primary" onPress={onSave} disabled={!isValid || saving} loading={saving}>
                {saveLabel ?? defaultSaveLabel}
              </Button>
            </View>
          </View>
        )}
      </View>
    </ScreenGuard>
  );
}

