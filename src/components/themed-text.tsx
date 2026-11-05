import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { type ThemeColor, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const resolvedThemeColor = themeColor ?? (type === 'linkPrimary' ? 'primary' : 'text');

  return <Text style={[{ color: theme[resolvedThemeColor] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  small: {
    fontSize: Typography.fontSize.small,
    lineHeight: Typography.lineHeight.small,
    fontWeight: Typography.fontWeight.medium,
  },
  smallBold: {
    fontSize: Typography.fontSize.small,
    lineHeight: Typography.lineHeight.small,
    fontWeight: Typography.fontWeight.bold,
  },
  default: {
    fontSize: Typography.fontSize.body,
    lineHeight: Typography.lineHeight.body,
    fontWeight: Typography.fontWeight.medium,
  },
  title: {
    fontSize: Typography.fontSize.display,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: Typography.lineHeight.display,
  },
  subtitle: {
    fontSize: Typography.fontSize.title,
    lineHeight: Typography.lineHeight.title,
    fontWeight: Typography.fontWeight.semibold,
  },
  link: {
    lineHeight: Typography.lineHeight.link,
    fontSize: Typography.fontSize.small,
  },
  linkPrimary: {
    lineHeight: Typography.lineHeight.link,
    fontSize: Typography.fontSize.small,
  },
  code: {
    fontFamily: Typography.fontFamily?.mono,
    fontWeight:
      Platform.select({ android: Typography.fontWeight.bold }) ?? Typography.fontWeight.medium,
    fontSize: Typography.fontSize.code,
  },
});
