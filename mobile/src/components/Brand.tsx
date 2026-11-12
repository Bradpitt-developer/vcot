import React from "react";
import { Scissors } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { APP_NAME } from "../constants/config";
import { colors, radii, shadow } from "../constants/theme";

export function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <View
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: size * 0.3,
        },
      ]}
    >
      <Scissors
        size={size * 0.52}
        color={colors.white}
        strokeWidth={2.2}
      />
    </View>
  );
}

export function BrandLockup({
  size = 40,
  dark = false,
}: {
  size?: number;
  dark?: boolean;
}) {
  return (
    <View style={styles.lockup}>
      <BrandMark size={size} />
      <View style={styles.textWrap}>
        <Text
          style={[styles.wordmark, { color: dark ? colors.white : colors.ink }]}
        >
          {APP_NAME}
        </Text>
        <Text
          style={[
            styles.tagline,
            { color: dark ? "rgba(255,255,255,0.72)" : colors.muted },
          ]}
        >
          Work entries, made simple
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    ...shadow.card,
  },
  lockup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  textWrap: {
    justifyContent: "center",
  },
  wordmark: {
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 10.5,
    marginTop: 1,
    fontWeight: "500",
  },
});
