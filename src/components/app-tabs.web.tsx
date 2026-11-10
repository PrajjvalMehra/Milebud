import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/primitives';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton icon="home">Home</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton icon="add">Contribute</TabButton>
          </TabTrigger>
          <TabTrigger name="account" href="/account" asChild>
            <TabButton icon="person">Account</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  icon,
  isFocused,
  ref: _ref,
  ...props
}: TabTriggerSlotProps & { icon: IconName }) {
  const theme = useTheme();
  const color = isFocused ? theme.primary : theme.textSecondary;

  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <View
        style={[styles.iconPill, isFocused && { backgroundColor: theme.primarySoft }]}>
        <Icon color={color} name={icon} size={24} />
      </View>
      <ThemedText type="small" style={[styles.tabLabel, { color }]}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const theme = useTheme();

  return (
    <View
      {...props}
      style={[
        styles.tabListContainer,
        { backgroundColor: theme.backgroundElement, borderTopColor: theme.backgroundSelected },
      ]}>
      <View style={styles.innerContainer}>{props.children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 1,
  },
  innerContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  tabButton: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconPill: {
    width: 56,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
