import { SymbolView } from 'expo-symbols';
import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BorderRadius,
  BottomTabInset,
  Colors,
  MaxContentWidth,
  Shadows,
  Spacing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const icons = {
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  add: { ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' },
  person: { ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  truck: { ios: 'box.truck.fill', android: 'local_shipping', web: 'local_shipping' },
  fuel: { ios: 'fuelpump.fill', android: 'local_gas_station', web: 'local_gas_station' },
  parking: { ios: 'parkingsign', android: 'local_parking', web: 'local_parking' },
  rest: { ios: 'bed.double.fill', android: 'hotel', web: 'hotel' },
  repair: { ios: 'wrench.and.screwdriver.fill', android: 'build', web: 'build' },
  scale: { ios: 'scalemass.fill', android: 'scale', web: 'scale' },
  warehouse: { ios: 'shippingbox.fill', android: 'warehouse', web: 'warehouse' },
  pin: { ios: 'mappin.circle.fill', android: 'location_on', web: 'location_on' },
  check: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  alert: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  clock: { ios: 'clock.fill', android: 'schedule', web: 'schedule' },
  shield: { ios: 'lock.shield.fill', android: 'verified_user', web: 'verified_user' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  group: { ios: 'person.2.fill', android: 'groups', web: 'groups' },
} as const;

export type IconName = keyof typeof icons;
export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

type Theme = (typeof Colors)['light'] | (typeof Colors)['dark'];

export function toneColors(theme: Theme, tone: Tone) {
  switch (tone) {
    case 'primary':
      return { foreground: theme.primary, background: theme.primarySoft };
    case 'success':
      return { foreground: theme.success, background: theme.successSoft };
    case 'warning':
      return { foreground: theme.warning, background: theme.warningSoft };
    case 'danger':
      return { foreground: theme.danger, background: theme.dangerSoft };
    case 'neutral':
      return { foreground: theme.textSecondary, background: theme.backgroundSelected };
  }
}

export function Icon({ color, name, size = 20 }: { color?: string; name: IconName; size?: number }) {
  const theme = useTheme();
  return <SymbolView name={icons[name]} size={size} tintColor={color ?? theme.text} />;
}

type PageLayoutProps = Pick<ScrollViewProps, 'keyboardShouldPersistTaps'> & {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export function PageLayout({
  children,
  contentContainerStyle,
  keyboardShouldPersistTaps,
}: PageLayoutProps) {
  return (
    <ThemedView type="background" style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[styles.content, contentContainerStyle]}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

export function PageHeader({
  description,
  eyebrow,
  title,
}: {
  description?: string;
  eyebrow?: string;
  title: string;
}) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.header} type="background">
      {!!eyebrow && (
        <ThemedText type="smallBold" style={[styles.eyebrow, { color: theme.primary }]}>
          {eyebrow}
        </ThemedText>
      )}
      <ThemedText type="title" style={styles.title}>
        {title}
      </ThemedText>
      {!!description && <ThemedText themeColor="textSecondary">{description}</ThemedText>}
    </ThemedView>
  );
}

export function SectionHeader({
  actionLabel,
  onAction,
  title,
}: {
  actionLabel?: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {!!actionLabel && !!onAction && <TextButton label={actionLabel} onPress={onAction} />}
    </View>
  );
}

export function SurfaceCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, { borderColor: theme.backgroundSelected }, Shadows.card, style]}>
      {children}
    </ThemedView>
  );
}

export function IconTile({
  name,
  size = 48,
  tone = 'primary',
}: {
  name: IconName;
  size?: number;
  tone?: Tone;
}) {
  const theme = useTheme();
  const { foreground, background } = toneColors(theme, tone);
  return (
    <View
      style={[
        styles.iconTile,
        { backgroundColor: background, height: size, width: size, borderRadius: size / 3 },
      ]}>
      <Icon color={foreground} name={name} size={size * 0.5} />
    </View>
  );
}

export function StatusPill({
  icon,
  label,
  tone = 'neutral',
}: {
  icon?: IconName;
  label: string;
  tone?: Tone;
}) {
  const theme = useTheme();
  const { foreground, background } = toneColors(theme, tone);
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      {icon ? <Icon color={foreground} name={icon} size={14} /> : (
        <View style={[styles.dot, { backgroundColor: foreground }]} />
      )}
      <ThemedText type="smallBold" style={[styles.pillText, { color: foreground }]}>
        {label}
      </ThemedText>
    </View>
  );
}

export function Chip({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : theme.backgroundElement,
          borderColor: selected ? theme.primary : theme.backgroundSelected,
        },
        pressed && styles.pressed,
      ]}>
      <ThemedText
        type="smallBold"
        style={{ color: selected ? theme.onPrimary : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      contentContainerStyle={styles.chipRow}
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      style={styles.chipScroll}>
      {children}
    </ScrollView>
  );
}

export function SearchField({
  accessibilityLabel,
  onChangeText,
  placeholder,
  value,
}: {
  accessibilityLabel: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.searchField,
        { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
        Shadows.card,
      ]}>
      <Icon color={theme.textSecondary} name="search" size={20} />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        returnKeyType="search"
        style={[styles.searchInput, { color: theme.text }]}
        value={value}
      />
    </View>
  );
}

export function TextField({
  label,
  style,
  ...props
}: TextInputProps & { label?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      {!!label && <ThemedText type="smallBold">{label}</ThemedText>}
      <TextInput
        placeholderTextColor={theme.textSecondary}
        {...props}
        style={[
          styles.input,
          {
            backgroundColor: theme.background,
            borderColor: theme.backgroundSelected,
            color: theme.text,
          },
          props.multiline && styles.multiline,
          style,
        ]}
      />
    </View>
  );
}

export function SegmentedControl<T extends string>({
  onChange,
  options,
  value,
}: {
  onChange: (value: T) => void;
  options: readonly { label: string; value: T }[];
  value: T;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: theme.backgroundSelected }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              selected && [{ backgroundColor: theme.backgroundElement }, Shadows.card],
            ]}>
            <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TextButton({
  disabled,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.textButton, pressed && styles.pressed, disabled && styles.disabled]}>
      <ThemedText type="smallBold" style={{ color: theme.primary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

type ButtonProps = {
  accessibilityLabel?: string;
  disabled?: boolean;
  isLoading?: boolean;
  label: string;
  onPress: () => void;
};

function Button({
  accessibilityLabel,
  disabled = false,
  isLoading = false,
  label,
  onPress,
  variant,
}: ButtonProps & { variant: 'primary' | 'secondary' }) {
  const theme = useTheme();
  const isDisabled = disabled || isLoading;
  const isPrimary = variant === 'primary';
  const foreground = isPrimary ? theme.onPrimary : theme.text;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary
          ? { backgroundColor: theme.primary }
          : { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected, borderWidth: 1.5 },
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}>
      {isLoading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <ThemedText type="smallBold" style={[styles.buttonText, { color: foreground }]}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

export function PrimaryButton(props: ButtonProps) {
  return <Button {...props} variant="primary" />;
}

export function SecondaryButton(props: ButtonProps) {
  return <Button {...props} variant="secondary" />;
}

export function EmptyState({
  description,
  icon,
  title,
  tone = 'neutral',
}: {
  description: string;
  icon: IconName;
  title: string;
  tone?: Tone;
}) {
  return (
    <View style={styles.empty}>
      <IconTile name={icon} size={64} tone={tone} />
      <ThemedText type="subtitle" style={styles.emptyTitle}>
        {title}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.emptyDescription}>
        {description}
      </ThemedText>
    </View>
  );
}

export function InlineMessage({ children, tone }: { children: ReactNode; tone: 'danger' | 'success' }) {
  const theme = useTheme();
  const { foreground, background } = toneColors(theme, tone);
  return (
    <View style={[styles.inlineMessage, { backgroundColor: background }]}>
      <Icon color={foreground} name={tone === 'danger' ? 'alert' : 'check'} size={18} />
      <ThemedText type="small" style={[styles.inlineMessageText, { color: foreground }]}>
        {children}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    flexGrow: 1,
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom:
      Platform.OS === 'web' ? Spacing.six + Spacing.five : BottomTabInset + Spacing.four,
  },
  header: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
  eyebrow: {
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: BorderRadius.extraLarge,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconTile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.pill,
  },
  pillText: {
    fontSize: 13,
    lineHeight: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  chipScroll: {
    flexGrow: 0,
  },
  chipRow: {
    gap: Spacing.two,
    paddingRight: Spacing.three,
  },
  searchField: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.large,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    minHeight: 52,
    fontSize: 16,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  multiline: {
    minHeight: 96,
    paddingTop: Spacing.three,
    textAlignVertical: 'top',
  },
  segmented: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: BorderRadius.medium,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.small + 2,
  },
  textButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: BorderRadius.large,
  },
  buttonText: {
    fontSize: 16,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.55,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  emptyTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  emptyDescription: {
    textAlign: 'center',
    maxWidth: 320,
  },
  inlineMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: BorderRadius.medium,
  },
  inlineMessageText: {
    flex: 1,
  },
});
