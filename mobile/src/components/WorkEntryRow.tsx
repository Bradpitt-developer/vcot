import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "../constants/theme";
import type { WorkEntry } from "../types";
import { formatDateTime } from "../utils/format";
import { Avatar } from "./Avatar";
import { DepartmentPill } from "./DepartmentPill";

export function WorkEntryRow({
  entry,
  showManager = false,
}: {
  entry: WorkEntry;
  showManager?: boolean;
}) {
  const meta = showManager
    ? `${formatDateTime(entry.createdAt)} · ${entry.managerName}`
    : formatDateTime(entry.createdAt);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Avatar
          name={entry.employeeName}
          department={entry.department}
          size={42}
        />
        <View style={styles.nameWrap}>
          <Text style={styles.name} numberOfLines={1}>
            {entry.employeeName}
          </Text>
          <Text style={styles.operation} numberOfLines={1}>
            {entry.operationName} · Lot {entry.lotNo}
          </Text>
        </View>
        <View style={styles.quantityWrap}>
          <Text style={styles.quantity}>{entry.quantity}</Text>
          <Text style={styles.pieces}>pcs</Text>
        </View>
      </View>
      <View style={styles.bottomRow}>
        <DepartmentPill department={entry.department} small />
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  nameWrap: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
  },
  operation: {
    fontSize: 11.5,
    color: colors.muted,
    fontWeight: "500",
  },
  quantityWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    backgroundColor: colors.primaryTint,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quantity: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.primaryDark,
    letterSpacing: -0.3,
  },
  pieces: {
    fontSize: 9.5,
    color: colors.primary,
    fontWeight: "700",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingLeft: 54,
  },
  meta: {
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
    color: colors.faint,
    fontWeight: "500",
  },
});
