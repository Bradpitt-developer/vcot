import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import { colors, radii, spacing } from "../constants/theme";

export function FieldLabel({
  label,
  required,
  hint,
}: {
  label: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {hint ? (
        <Text style={styles.hint} numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function TextField({
  label,
  required,
  hint,
  error,
  containerStyle,
  rightAccessory,
  ...props
}: TextInputProps & {
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
  rightAccessory?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <FieldLabel label={label} required={required} hint={hint} />
      ) : null}
      <View
        style={[
          styles.inputWrap,
          focused && styles.inputWrapFocused,
          error ? styles.inputWrapError : null,
        ]}
      >
        <TextInput
          {...props}
          placeholderTextColor={colors.faint}
          style={[styles.input, props.style]}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
        />
        {rightAccessory ? (
          <View style={styles.accessory}>{rightAccessory}</View>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorBannerText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 7,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  label: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.body,
  },
  required: {
    color: colors.primary,
  },
  hint: {
    fontSize: 10.5,
    color: colors.faint,
    fontWeight: "500",
    flexShrink: 1,
    textAlign: "right",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  inputWrapFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  inputWrapError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 0,
    fontWeight: "500",
  },
  accessory: {
    marginLeft: spacing.sm,
  },
  error: {
    fontSize: 11.5,
    color: colors.danger,
    fontWeight: "600",
  },
  errorBanner: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "#F3CCC8",
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  errorBannerText: {
    color: colors.danger,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "600",
  },
});
