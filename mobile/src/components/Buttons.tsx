import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";

import { colors, radii, shadow, spacing } from "../constants/theme";

type ButtonVariant = "primary" | "outline" | "soft" | "danger" | "dark" | "ghost";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

const variants: Record<
  ButtonVariant,
  { background: string; text: string; border: string }
> = {
  primary: {
    background: colors.primary,
    text: colors.white,
    border: colors.primary,
  },
  outline: {
    background: colors.surface,
    text: colors.ink,
    border: colors.line,
  },
  soft: {
    background: colors.primarySoft,
    text: colors.primaryDark,
    border: colors.primarySoft,
  },
  danger: {
    background: colors.dangerSoft,
    text: colors.danger,
    border: colors.dangerSoft,
  },
  dark: {
    background: colors.admin,
    text: colors.white,
    border: colors.admin,
  },
  ghost: {
    background: "transparent",
    text: colors.primary,
    border: "transparent",
  },
};

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  icon,
  style,
  compact = false,
}: PrimaryButtonProps) {
  const palette = variants[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      android_ripple={{ color: "rgba(0,0,0,0.08)" }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          opacity: inactive ? 0.5 : pressed ? 0.86 : 1,
        },
        variant !== "ghost" && shadow.soft,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.label,
              { color: palette.text },
              compact && styles.compactLabel,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function BackButton({
  onPress,
  light = false,
}: {
  onPress?: () => void;
  light?: boolean;
}) {
  const navigation = useNavigation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      onPress={onPress ?? (() => navigation.goBack())}
      hitSlop={8}
      style={({ pressed }) => [
        styles.back,
        {
          backgroundColor: light ? "rgba(255,255,255,0.16)" : colors.surface,
          borderColor: light ? "transparent" : colors.line,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <ArrowLeft
        size={20}
        color={light ? colors.white : colors.ink}
        strokeWidth={2.4}
      />
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  tone = "light",
  size = 40,
  style,
}: {
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  tone?: "light" | "soft" | "danger";
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const background =
    tone === "danger"
      ? colors.dangerSoft
      : tone === "soft"
        ? colors.primarySoft
        : colors.surface;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: background,
          opacity: pressed ? 0.7 : 1,
        },
        tone === "light" && shadow.soft,
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  compact: {
    minHeight: 42,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.sm,
  },
  label: {
    fontSize: 15.5,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  compactLabel: {
    fontSize: 13.5,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    ...shadow.soft,
  },
  iconButton: {
    alignItems: "center",
    justifyContent: "center",
  },
});
