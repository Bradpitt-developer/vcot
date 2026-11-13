import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  Info,
  LogOut,
  Plus,
  Scissors,
  ShieldCheck,
  Shirt,
  UsersRound,
  Wrench,
} from "lucide-react-native";

import { Avatar } from "../../components/Avatar";
import { PrimaryButton } from "../../components/Buttons";
import { AdminPill, DepartmentPill } from "../../components/DepartmentPill";
import { ErrorBanner } from "../../components/Form";
import { ScreenHeader } from "../../components/ScreenHeader";
import { SectionHeader } from "../../components/SectionHeader";
import { APP_VERSION, IS_DEMO } from "../../constants/config";
import { colors, departmentColors, radii, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { AdminManageSheet } from "./AdminManageSheet";
import type {
  AdminStackParamList,
  AdminTabParamList,
} from "../../navigation/types";
import { data } from "../../services/data";
import type { Department, Operation } from "../../types";
import { confirmAction } from "../../utils/confirm";
import { errorMessage } from "../../utils/format";

type Props = BottomTabScreenProps<AdminTabParamList, "Setup">;

const departments: Department[] = ["PETTICOAT", "RMG"];

export function AdminSetupScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const [operations, setOperations] = useState<Operation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adminManageOpen, setAdminManageOpen] = useState(false);
  const loadedOnce = useRef(false);

  const rootNavigation =
    navigation.getParent<NativeStackNavigationProp<AdminStackParamList>>();

  const loadOperations = useCallback(async (options?: { refresh?: boolean; quiet?: boolean }) => {
    if (options?.refresh) setRefreshing(true);
    else if (!loadedOnce.current) setLoading(true);

    try {
      const result = await data.operations();
      setOperations(result);
      setError(null);
      loadedOnce.current = true;
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadOperations({ quiet: loadedOnce.current });
    }, [loadOperations])
  );

  async function updateOperationActive(operation: Operation, nextValue: boolean) {
    setBusyId(operation.id);
    try {
      const updated = await data.updateOperation(operation.id, {
        isActive: nextValue,
      });
      setOperations((current) =>
        (current || []).map((item) => (item.id === updated.id ? updated : item))
      );
      showToast(
        nextValue
          ? `${operation.name} is active again.`
          : `${operation.name} has been disabled.`,
        "success"
      );
    } catch (toggleError) {
      showToast(errorMessage(toggleError), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmToggle(operation: Operation, nextValue: boolean) {
    if (!nextValue) {
      const confirmed = await confirmAction({
        title: "Disable operation?",
        message: `${operation.name} will disappear from the manager's operation dropdown.`,
        confirmLabel: "Disable",
        destructive: true,
      });
      if (!confirmed) return;
    }
    await updateOperationActive(operation, nextValue);
  }

  async function confirmLogout() {
    const confirmed = await confirmAction({
      title: "Log out?",
      message: "You will need your admin login details to sign in again.",
      confirmLabel: "Log out",
      destructive: true,
    });
    if (confirmed) await signOut();
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Setup"
        subtitle="Operations and admin account"
        border={false}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadOperations({ refresh: true })}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <SectionHeader
          title="Operations"
          actionLabel="Add"
          onAction={() => rootNavigation?.navigate("AddOperation")}
        />
        <Text style={styles.sectionHint}>
          Managers can only choose active operations from their own section.
        </Text>

        {error ? <ErrorBanner message={error} /> : null}

        {loading && !operations ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading operations…</Text>
          </View>
        ) : (
          <View style={styles.operationGroups}>
            {departments.map((department) => {
              const palette = departmentColors[department];
              const DepartmentIcon =
                department === "PETTICOAT" ? Scissors : Shirt;
              const group = (operations || []).filter(
                (operation) => operation.department === department
              );

              return (
                <View key={department} style={styles.operationCard}>
                  <View style={styles.operationHeader}>
                    <View
                      style={[
                        styles.operationIcon,
                        { backgroundColor: palette.soft },
                      ]}
                    >
                      <DepartmentIcon
                        size={17}
                        color={palette.color}
                        strokeWidth={2.2}
                      />
                    </View>
                    <Text style={styles.operationDepartment}>
                      {palette.label}
                    </Text>
                    <Text style={styles.operationCount}>{group.length}</Text>
                  </View>
                  {group.length > 0 ? (
                    group.map((operation, index) => (
                      <View
                        key={operation.id}
                        style={[
                          styles.operationRow,
                          index < group.length - 1 &&
                            styles.operationRowBorder,
                        ]}
                      >
                        <Text
                          style={[
                            styles.operationName,
                            !operation.isActive && styles.operationNameMuted,
                          ]}
                          numberOfLines={1}
                        >
                          {operation.name}
                        </Text>
                        {!operation.isActive ? (
                          <Text style={styles.disabledLabel}>Disabled</Text>
                        ) : null}
                        <Switch
                          value={operation.isActive}
                          onValueChange={(next) => confirmToggle(operation, next)}
                          disabled={busyId === operation.id}
                          trackColor={{
                            false: colors.line,
                            true: colors.primarySoft,
                          }}
                          thumbColor={
                            operation.isActive ? colors.primary : colors.surface
                          }
                          ios_backgroundColor={colors.line}
                          accessibilityLabel={`${operation.name} active status`}
                        />
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noOperations}>
                      No operations yet. Tap Add to create one.
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add operation"
          onPress={() => rootNavigation?.navigate("AddOperation")}
          style={({ pressed }) => [
            styles.addOperationButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <View style={styles.addOperationIcon}>
            <Plus size={17} color={colors.primaryDark} strokeWidth={2.5} />
          </View>
          <View style={styles.addOperationText}>
            <Text style={styles.addOperationTitle}>Add operation</Text>
            <Text style={styles.addOperationHint}>
              Create another operation for a section
            </Text>
          </View>
          <Wrench size={17} color={colors.faint} strokeWidth={2} />
        </Pressable>

        <View style={styles.accountSection}>
          <SectionHeader title="Admin account" />
          <View style={styles.accountCard}>
            <Avatar name={user?.name || "Admin"} admin size={46} />
            <View style={styles.accountText}>
              <Text style={styles.accountName}>{user?.name || "Admin"}</Text>
              <Text style={styles.accountUsername}>@{user?.username}</Text>
              <View style={styles.accountPill}>
                <AdminPill />
              </View>
            </View>
            <ShieldCheck size={22} color={colors.faint} strokeWidth={1.9} />
          </View>
          <View style={styles.infoRow}>
            <Info size={16} color={colors.muted} strokeWidth={2} />
            <Text style={styles.infoText}>
              The main admin password can add or remove administrator accounts.
              It is never saved on this device.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Manage admins"
            onPress={() => setAdminManageOpen(true)}
            style={({ pressed }) => [
              styles.manageAdminButton,
              pressed && styles.manageAdminButtonPressed,
            ]}
          >
            <View style={styles.manageAdminIcon}>
              <UsersRound
                size={18}
                color={colors.white}
                strokeWidth={2.2}
              />
            </View>
            <View style={styles.manageAdminText}>
              <Text style={styles.manageAdminTitle}>Manage admins</Text>
              <Text style={styles.manageAdminHint}>
                Add or remove administrator accounts
              </Text>
            </View>
            <ShieldCheck
              size={19}
              color={colors.faint}
              strokeWidth={1.9}
            />
          </Pressable>
          <PrimaryButton
            label="Log out"
            variant="danger"
            onPress={confirmLogout}
            icon={<LogOut size={17} color={colors.danger} strokeWidth={2.2} />}
          />
        </View>

        <View style={styles.modeRow}>
          <View
            style={[
              styles.modeDot,
              { backgroundColor: IS_DEMO ? colors.warning : colors.success },
            ]}
          />
          <Text style={styles.modeText}>
            {IS_DEMO
              ? "Preview mode · sample data stored on this phone"
              : "Live mode · connected to the factory API"}
          </Text>
        </View>
        <Text style={styles.version}>Silai Saathi v{APP_VERSION}</Text>
      </ScrollView>
      <AdminManageSheet
        visible={adminManageOpen}
        onClose={() => setAdminManageOpen(false)}
        currentUserId={user?.id}
      />
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
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  sectionHint: {
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.muted,
    marginTop: -6,
    marginBottom: spacing.sm,
  },
  loadingCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  loadingText: {
    fontSize: 11.5,
    color: colors.muted,
    fontWeight: "500",
  },
  operationGroups: {
    gap: spacing.md,
  },
  operationCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  operationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  operationIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  operationDepartment: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "800",
    color: colors.ink,
  },
  operationCount: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
    backgroundColor: colors.lineSoft,
    minWidth: 20,
    textAlign: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
  },
  operationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 53,
  },
  operationRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  operationName: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.ink,
  },
  operationNameMuted: {
    color: colors.faint,
  },
  disabledLabel: {
    fontSize: 9.5,
    color: colors.faint,
    fontWeight: "600",
  },
  noOperations: {
    fontSize: 11,
    color: colors.faint,
    paddingVertical: spacing.lg,
  },
  addOperationButton: {
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  addOperationIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  addOperationText: {
    flex: 1,
  },
  addOperationTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.ink,
  },
  addOperationHint: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 1.5,
  },
  accountSection: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing.md,
  },
  accountText: {
    flex: 1,
    gap: 1,
  },
  accountName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
  },
  accountUsername: {
    fontSize: 10.5,
    color: colors.muted,
    fontWeight: "500",
  },
  accountPill: {
    marginTop: 3,
  },
  infoRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  infoText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: colors.faint,
  },
  manageAdminButton: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.admin,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  manageAdminButtonPressed: {
    backgroundColor: "#102E2D",
    transform: [{ scale: 0.99 }],
  },
  manageAdminIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryBright,
  },
  manageAdminText: {
    flex: 1,
  },
  manageAdminTitle: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
  },
  manageAdminHint: {
    color: "#D8E8E5",
    fontSize: 9.5,
    fontWeight: "500",
    marginTop: 2,
  },
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: spacing.lg,
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
