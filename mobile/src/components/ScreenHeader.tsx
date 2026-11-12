import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../constants/theme";
import { BackButton } from "./Buttons";

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  border = true,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  border?: boolean;
}) {
  return (
    <View style={[styles.header, border && styles.border]}>
      <View style={styles.left}>
        {onBack ? <BackButton onPress={onBack} /> : null}
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.canvas,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  titles: {
    flexShrink: 1,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.muted,
    marginTop: 2,
    fontWeight: "500",
  },
  right: {
    flexShrink: 0,
  },
});
