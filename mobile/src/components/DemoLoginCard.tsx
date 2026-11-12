import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FlaskConical } from "lucide-react-native";

import { colors, radii, spacing } from "../constants/theme";

export function DemoLoginCard({
  username,
  password,
  onUse,
}: {
  username: string;
  password: string;
  onUse: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <FlaskConical size={16} color={colors.warning} strokeWidth={2.2} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Preview login</Text>
          <Text style={styles.hint}>For testing before Supabase is connected.</Text>
        </View>
      </View>
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Login ID</Text>
          <Text style={styles.detailValue}>{username}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Password</Text>
          <Text style={styles.detailValue}>{password}</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fill the preview login details"
        onPress={onUse}
        style={({ pressed }) => [
          styles.useButton,
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={styles.useText}>Use preview login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#F1DFC0",
    borderStyle: "dashed",
    backgroundColor: colors.warningSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.warning,
  },
  hint: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.muted,
    marginTop: 1,
  },
  details: {
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  detailLabel: {
    fontSize: 10.5,
    color: colors.muted,
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 11.5,
    color: colors.ink,
    fontWeight: "800",
  },
  useButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "#ECD8B5",
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  useText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.warning,
  },
});
