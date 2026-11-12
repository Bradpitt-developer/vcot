import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BadgeCheck,
  Info,
  KeyRound,
  LogOut,
  ShieldCheck,
} from "lucide-react-native";

import { Avatar } from "../../components/Avatar";
import { PrimaryButton } from "../../components/Buttons";
import { DepartmentPill } from "../../components/DepartmentPill";
import { ScreenHeader } from "../../components/ScreenHeader";
import { APP_VERSION, IS_DEMO } from "../../constants/config";
import { colors, radii, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { confirmAction } from "../../utils/confirm";
import { departmentLabel } from "../../utils/format";

export function ManagerAccountScreen() {
  const { user, signOut } = useAuth();

  async function confirmLogout() {
    const confirmed = await confirmAction({
      title: "Log out?",
      message: "You will need your login ID and password to sign in again.",
      confirmLabel: "Log out",
      destructive: true,
    });
    if (confirmed) await signOut();
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Account" subtitle="Your manager profile" border={false} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <Avatar
            name={user?.name || "Manager"}
            department={user?.department || null}
            size={72}
          />
          <Text style={styles.name}>{user?.name || "Manager"}</Text>
          {user?.department ? (
            <DepartmentPill department={user.department} />
          ) : null}
          <View style={styles.statusRow}>
            <BadgeCheck size={14} color={colors.success} strokeWidth={2.4} />
            <Text style={styles.statusText}>Active manager account</Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Login details</Text>
          <InfoRow
            icon={<KeyRound size={16} color={colors.muted} strokeWidth={2} />}
            label="Login ID"
            value={user?.username || "-"}
          />
          <InfoRow
            icon={<ShirtIcon />}
            label="Section"
            value={departmentLabel(user?.department || null)}
          />
          <InfoRow
            icon={<ShieldCheck size={16} color={colors.muted} strokeWidth={2} />}
            label="Access"
            value="Manager"
            last
          />
        </View>

        <View style={styles.infoCard}>
          <Info size={18} color={colors.primaryDark} strokeWidth={2.2} />
          <View style={styles.infoTextWrap}>
            <Text style={styles.infoTitle}>Need a change?</Text>
            <Text style={styles.infoText}>
              Your admin manages your login ID, password and section. Contact
              the admin if anything needs to be updated.
            </Text>
          </View>
        </View>

        <View style={styles.modeCard}>
          <View
            style={[
              styles.modeDot,
              {
                backgroundColor: IS_DEMO ? colors.warning : colors.success,
              },
            ]}
          />
          <Text style={styles.modeText}>
            {IS_DEMO
              ? "Preview mode · data is stored only on this phone"
              : "Connected to the factory server"}
          </Text>
        </View>

        <PrimaryButton
          label="Log out"
          onPress={confirmLogout}
          variant="danger"
          icon={<LogOut size={17} color={colors.danger} strokeWidth={2.2} />}
        />

        <Text style={styles.version}>Silai Saathi v{APP_VERSION}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ShirtIcon() {
  return (
    <View style={styles.shirtIcon}>
      <Text style={styles.shirtLetter}>S</Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <View style={styles.infoRowIcon}>{icon}</View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.5,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.xs,
  },
  statusText: {
    fontSize: 10.5,
    color: colors.success,
    fontWeight: "600",
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  infoRow: {
    minHeight: 51,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  infoRowIcon: {
    width: 23,
    alignItems: "center",
  },
  infoLabel: {
    flex: 1,
    fontSize: 12,
    color: colors.muted,
    fontWeight: "500",
  },
  infoValue: {
    maxWidth: "55%",
    fontSize: 12.5,
    color: colors.ink,
    fontWeight: "700",
    textAlign: "right",
  },
  shirtIcon: {
    width: 16,
    height: 16,
    borderRadius: 5,
    backgroundColor: colors.lineSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  shirtLetter: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.muted,
  },
  infoCard: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.primaryTint,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  infoText: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.body,
    marginTop: 3,
  },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: spacing.sm,
  },
  modeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modeText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
    color: colors.faint,
    fontWeight: "500",
  },
  version: {
    fontSize: 10,
    color: colors.faint,
    textAlign: "center",
    marginTop: -4,
  },
});
