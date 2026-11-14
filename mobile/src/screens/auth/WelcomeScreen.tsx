import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ClipboardPenLine, Hash, UserRound } from "lucide-react-native";

import { BrandLockup } from "../../components/Brand";
import { PrimaryButton } from "../../components/Buttons";
import { IS_DEMO } from "../../constants/config";
import { colors, radii, spacing } from "../../constants/theme";
import type { AuthStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "Welcome">;

const steps = [
  {
    title: "Choose the employee",
    detail: "Select a worker from your section",
    icon: UserRound,
  },
  {
    title: "Choose the operation",
    detail: "Kamarpatti, interlock, folding and more",
    icon: ClipboardPenLine,
  },
  {
    title: "Add lot and quantity",
    detail: "Tap + or −, then submit the entry",
    icon: Hash,
  },
];

export function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <BrandLockup />
          {IS_DEMO ? (
            <View style={styles.previewPill}>
              <Text style={styles.previewText}>PREVIEW</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.hero}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowDot} />
            <Text style={styles.eyebrow}>EMPLOYEE & PRODUCTION</Text>
          </View>
          <Text style={styles.heading}>
            Every worker.{"\n"}Every entry.{"\n"}
            <Text style={styles.headingAccent}>One simple app.</Text>
          </Text>
          <Text style={styles.description}>
            Record daily Petticoat work clearly — no registers, no
            confusion.
          </Text>
        </View>

        <View style={styles.stepsCard}>
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <View
                key={step.title}
                style={[styles.step, index < steps.length - 1 && styles.stepBorder]}
              >
                <View style={styles.stepIcon}>
                  <Icon size={19} color={colors.primaryDark} strokeWidth={2.1} />
                </View>
                <View style={styles.stepText}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDetail}>{step.detail}</Text>
                </View>
                <Text style={styles.stepNumber}>0{index + 1}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.spacer} />

        <View style={styles.footer}>
          <PrimaryButton
            label="Login"
            onPress={() => navigation.navigate("RoleSelect")}
          />
          <Text style={styles.helper}>
            Your login ID and password are created by your admin.
          </Text>
          {IS_DEMO ? (
            <Text style={styles.previewHint}>
              Preview mode · sample data stays on this phone
            </Text>
          ) : null}
        </View>
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
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  previewPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.warningSoft,
  },
  previewText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: colors.warning,
  },
  hero: {
    paddingTop: spacing.xxxl + 8,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: spacing.md,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryBright,
  },
  eyebrow: {
    fontSize: 10.5,
    letterSpacing: 1.1,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  heading: {
    fontSize: 36,
    lineHeight: 43,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -1.2,
  },
  headingAccent: {
    color: colors.primary,
  },
  description: {
    marginTop: spacing.lg,
    fontSize: 13.5,
    lineHeight: 21,
    color: colors.body,
    maxWidth: 310,
    fontWeight: "500",
  },
  stepsCard: {
    marginTop: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingHorizontal: spacing.lg,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: spacing.md,
  },
  stepBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  stepIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  stepDetail: {
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 2,
    color: colors.muted,
  },
  stepNumber: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.faint,
    letterSpacing: 0.8,
  },
  spacer: {
    flex: 1,
    minHeight: spacing.xxl,
  },
  footer: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  helper: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
    textAlign: "center",
    fontWeight: "500",
  },
  previewHint: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.faint,
    textAlign: "center",
    fontWeight: "500",
  },
});
