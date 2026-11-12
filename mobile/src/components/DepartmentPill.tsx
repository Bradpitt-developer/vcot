import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, departmentColors, radii } from "../constants/theme";
import type { Department } from "../types";

export function DepartmentPill({
  department,
  small = false,
}: {
  department: Department;
  small?: boolean;
}) {
  const palette = departmentColors[department];

  return (
    <View
      style={[
        styles.pill,
        small && styles.small,
        { backgroundColor: palette.soft },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: palette.color }]} />
      <Text
        style={[
          styles.text,
          small && styles.smallText,
          { color: palette.color },
        ]}
      >
        {palette.label}
      </Text>
    </View>
  );
}

export function AdminPill() {
  return (
    <View style={[styles.pill, { backgroundColor: colors.adminSoft }]}>
      <View style={[styles.dot, { backgroundColor: colors.admin }]} />
      <Text style={[styles.text, { color: colors.admin }]}>Admin</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: "800",
  },
  smallText: {
    fontSize: 10,
  },
});
