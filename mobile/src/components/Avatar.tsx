import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii } from "../constants/theme";
import type { Department } from "../types";
import { initials } from "../utils/format";

export function Avatar({
  name,
  department,
  admin = false,
  size = 44,
}: {
  name: string;
  department?: Department | null;
  admin?: boolean;
  size?: number;
}) {
  const palette = admin
    ? { bg: colors.admin, fg: colors.white }
    : department === "PETTICOAT"
      ? { bg: colors.petticoatSoft, fg: colors.petticoat }
      : department === "RMG"
        ? { bg: colors.rmgSoft, fg: colors.rmg }
        : { bg: colors.primarySoft, fg: colors.primaryDark };

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.bg,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: palette.fg, fontSize: Math.max(12, size * 0.32) },
        ]}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "800",
    letterSpacing: -0.3,
  },
});
