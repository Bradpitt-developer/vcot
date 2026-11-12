import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandLockup } from "../components/Brand";
import { colors, spacing } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { AdminNavigator } from "./AdminNavigator";
import { AuthNavigator } from "./AuthNavigator";
import { ManagerNavigator } from "./ManagerNavigator";

export function RootNavigator() {
  const { ready, user } = useAuth();

  if (!ready) {
    return (
      <SafeAreaView style={styles.boot}>
        <BrandLockup size={54} />
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
        <Text style={styles.loadingText}>Preparing your workspace…</Text>
      </SafeAreaView>
    );
  }

  if (user?.role === "admin") {
    return <AdminNavigator />;
  }

  if (user?.role === "manager") {
    return <ManagerNavigator />;
  }

  return <AuthNavigator />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.xxl,
  },
  spinner: {
    marginTop: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 11,
    color: colors.muted,
    fontWeight: "500",
  },
});
