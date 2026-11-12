import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ChevronRight,
  Scissors,
  ShieldCheck,
  Shirt,
} from "lucide-react-native";

import { ScreenHeader } from "../../components/ScreenHeader";
import {
  colors,
  departmentColors,
  radii,
  spacing,
} from "../../constants/theme";
import type { AuthStackParamList } from "../../navigation/types";
import type { Department } from "../../types";

type Props = NativeStackScreenProps<AuthStackParamList, "RoleSelect">;

const roles: Array<{
  department: Department;
  title: string;
  description: string;
  icon: typeof Scissors;
}> = [
  {
    department: "PETTICOAT",
    title: "Petticoat",
    description: "Manager login for the Petticoat section",
    icon: Scissors,
  },
  {
    department: "RMG",
    title: "RMG",
    description: "Manager login for the RMG section",
    icon: Shirt,
  },
];

export function RoleSelectScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScreenHeader
        title="Login"
        subtitle="Choose your section to continue"
        onBack={() => navigation.goBack()}
        border={false}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headingBlock}>
          <Text style={styles.eyebrow}>MANAGER ACCESS</Text>
          <Text style={styles.heading}>Choose your section</Text>
          <Text style={styles.description}>
            Select the section you manage. Your admin has already created your
            login details.
          </Text>
        </View>

        <View style={styles.roleList}>
          {roles.map((role) => {
            const palette = departmentColors[role.department];
            const Icon = role.icon;
            return (
              <Pressable
                key={role.department}
                accessibilityRole="button"
                accessibilityLabel={`${role.title} manager login`}
                onPress={() =>
                  navigation.navigate("ManagerLogin", {
                    department: role.department,
                  })
                }
                style={({ pressed }) => [
                  styles.roleCard,
                  {
                    borderColor: pressed ? palette.color : colors.line,
                    opacity: pressed ? 0.86 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.roleIcon,
                    { backgroundColor: palette.soft },
                  ]}
                >
                  <Icon size={27} color={palette.color} strokeWidth={2} />
                </View>
                <View style={styles.roleText}>
                  <Text style={styles.roleTitle}>{role.title}</Text>
                  <Text style={styles.roleDescription}>{role.description}</Text>
                </View>
                <View style={styles.arrow}>
                  <ChevronRight
                    size={19}
                    color={colors.muted}
                    strokeWidth={2.2}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.divider} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Admin login"
          onPress={() => navigation.navigate("AdminLogin")}
          style={({ pressed }) => [
            styles.adminButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <ShieldCheck size={17} color={colors.admin} strokeWidth={2.2} />
          <Text style={styles.adminText}>Admin login</Text>
          <ChevronRight size={15} color={colors.muted} strokeWidth={2.2} />
        </Pressable>

        <Text style={styles.footerHint}>
          Managers cannot create their own accounts. Please contact the admin
          for a login ID or password reset.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  headingBlock: {
    marginBottom: spacing.xxl,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.1,
    color: colors.primary,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  heading: {
    fontSize: 28,
    lineHeight: 35,
    color: colors.ink,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  description: {
    marginTop: spacing.sm,
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.muted,
    maxWidth: 320,
  },
  roleList: {
    gap: spacing.md,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.lg,
    minHeight: 92,
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  roleText: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.4,
  },
  roleDescription: {
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.muted,
    marginTop: 2,
  },
  arrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.lineSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginVertical: spacing.xxl,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },
  orText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.faint,
    letterSpacing: 0.8,
  },
  adminButton: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  adminText: {
    fontSize: 12.5,
    color: colors.admin,
    fontWeight: "700",
  },
  footerHint: {
    marginTop: spacing.xxl,
    fontSize: 10.5,
    lineHeight: 16,
    color: colors.faint,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
    fontWeight: "500",
  },
});
