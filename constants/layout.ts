import { StyleSheet } from 'react-native';

export const SPACING = {
  screenPadding: 16,
  contentGap: 12,
  tabGap: 16,
  tabPaddingBottom: 12,
  compactGap: 8,
} as const;

export const LAYOUT_STYLES = StyleSheet.create({
  scrollScreenPadded: {
    padding: SPACING.screenPadding,
  },
  scrollScreenPaddedGapped: {
    padding: SPACING.screenPadding,
    gap: SPACING.contentGap,
  },
  tabBarContent: {
    gap: SPACING.tabGap,
    paddingBottom: SPACING.tabPaddingBottom,
  },
  compactGapped: {
    gap: SPACING.compactGap,
  },
});

