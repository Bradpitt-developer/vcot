import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ClipboardList } from "lucide-react-native";

import { colors, radii, spacing } from "../constants/theme";

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <ClipboardList size={26} color={colors.primary} strokeWidth={1.9} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 14.5,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
  },
  message: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
    textAlign: "center",
    marginTop: 5,
    maxWidth: 280,
  },
  action: {
    marginTop: spacing.lg,
  },
});
