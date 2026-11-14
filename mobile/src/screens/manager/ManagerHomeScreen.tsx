import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import {
  Box,
  ClipboardList,
  ClipboardPenLine,
  LogOut,
  UserRound,
} from "lucide-react-native";

import { Avatar } from "../../components/Avatar";
import { IconButton, PrimaryButton } from "../../components/Buttons";
import { DepartmentPill } from "../../components/DepartmentPill";
import { EmptyState } from "../../components/EmptyState";
import { ErrorBanner, FieldLabel, TextField } from "../../components/Form";
import { QuantityStepper } from "../../components/QuantityStepper";
import { ScreenHeader } from "../../components/ScreenHeader";
import { SectionHeader } from "../../components/SectionHeader";
import { SelectField, type SelectOption } from "../../components/SelectSheet";
import { WorkEntryRow } from "../../components/WorkEntryRow";
import { colors, radii, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import type { ManagerTabParamList } from "../../navigation/types";
import { data } from "../../services/data";
import { ProductionWorkflowCard } from "./ProductionWorkflowCard";
import type { ManagerHomeData } from "../../types";
import { confirmAction } from "../../utils/confirm";
import { errorMessage, firstName } from "../../utils/format";

type Props = BottomTabScreenProps<ManagerTabParamList, "Entry">;

export function ManagerHomeScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const { showToast } = useToast();

  const [home, setHome] = useState<ManagerHomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [lotNo, setLotNo] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadedOnce = useRef(false);

  const loadHome = useCallback(async (options?: { refresh?: boolean; quiet?: boolean }) => {
    if (options?.refresh) setRefreshing(true);
    else if (!loadedOnce.current) setLoading(true);

    try {
      const result = await data.managerHome();
      setHome(result);
      setLoadError(null);
      loadedOnce.current = true;
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHome({ quiet: loadedOnce.current });
    }, [loadHome])
  );

  useEffect(() => {
    if (!home) return;
    if (employeeId && !home.employees.some((item) => item.id === employeeId)) {
      setEmployeeId(null);
    }
    if (
      operationId &&
      !home.operations.some((item) => item.id === operationId)
    ) {
      setOperationId(null);
    }
  }, [home, employeeId, operationId]);

  const employeeOptions: SelectOption[] =
    home?.employees.map((employee) => ({
      value: employee.id,
      label: employee.name,
      hint: "Employee",
    })) || [];

  const operationOptions: SelectOption[] =
    home?.operations.map((operation) => ({
      value: operation.id,
      label: operation.name,
      hint: "Operation",
    })) || [];

  const selectedEmployee = home?.employees.find(
    (employee) => employee.id === employeeId
  );

  async function handleSubmit() {
    setSubmitError(null);

    if (!employeeId || !operationId) {
      setSubmitError("Select an employee and an operation first.");
      return;
    }
    if (!lotNo.trim()) {
      setSubmitError("Enter the lot number.");
      return;
    }
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 1_000_000
    ) {
      setSubmitError("Quantity must be a whole number from 1 to 1,000,000.");
      return;
    }

    setSubmitting(true);
    try {
      const entry = await data.createWorkEntry({
        employeeId,
        operationId,
        lotNo: lotNo.trim(),
        quantity,
      });
      showToast(
        `Entry saved for ${entry.employeeName} · ${entry.quantity} pcs`,
        "success"
      );
      setEmployeeId(null);
      setOperationId(null);
      setLotNo("");
      setQuantity(1);
      await loadHome({ quiet: true });
    } catch (error) {
      setSubmitError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmLogout() {
    const confirmed = await confirmAction({
      title: "Log out?",
      message: "You will need your login ID and password to sign in again.",
      confirmLabel: "Log out",
      destructive: true,
    });
    if (confirmed) await signOut();
  }

  const recentEntries = home?.entries.slice(0, 3) || [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Avatar
          name={user?.name || "Manager"}
          department={user?.department || null}
          size={46}
        />
        <View style={styles.headerText}>
          <Text style={styles.greeting}>Namaste, {firstName(user?.name || "")}</Text>
          <Text style={styles.headerSub}>Let's record today's work</Text>
        </View>
        <IconButton
          icon={<LogOut size={18} color={colors.body} strokeWidth={2.1} />}
          onPress={confirmLogout}
          accessibilityLabel="Log out"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadHome({ refresh: true })}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {loading && !home ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading your team…</Text>
          </View>
        ) : null}

        {loadError ? (
          <View style={styles.loadErrorWrap}>
            <ErrorBanner message={loadError} />
            <PrimaryButton
              label="Try again"
              variant="outline"
              compact
              onPress={() => void loadHome()}
            />
          </View>
        ) : null}

        {home ? (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <ClipboardList
                    size={18}
                    color={colors.primaryDark}
                    strokeWidth={2.2}
                  />
                </View>
                <Text style={styles.statValue}>{home.stats.todayEntries}</Text>
                <Text style={styles.statLabel}>Entries today</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, styles.statIconBlue]}>
                  <Box size={18} color={colors.rmg} strokeWidth={2.2} />
                </View>
                <Text style={styles.statValue}>{home.stats.todayPieces}</Text>
                <Text style={styles.statLabel}>Pieces today</Text>
              </View>
              <View style={styles.sectionMini}>
                <DepartmentPill
                  department={home.employees[0]?.department || user?.department || "PETTICOAT"}
                  small
                />
                <Text style={styles.sectionMiniText}>
                  {home.employees.length} employee
                  {home.employees.length === 1 ? "" : "s"}
                </Text>
              </View>
            </View>

            {user?.department === "PETTICOAT" ? (
              <ProductionWorkflowCard
                home={home}
                onSaved={() => void loadHome({ quiet: true })}
              />
            ) : (
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <View style={styles.formIcon}>
                  <ClipboardPenLine
                    size={20}
                    color={colors.primaryDark}
                    strokeWidth={2.2}
                  />
                </View>
                <View style={styles.formTitleWrap}>
                  <Text style={styles.formTitle}>Add work entry</Text>
                  <Text style={styles.formSub}>
                    Select employee, operation and quantity
                  </Text>
                </View>
              </View>

              <SelectField
                label="Employee"
                placeholder="Select employee"
                value={employeeId}
                options={employeeOptions}
                onChange={(value) => {
                  setEmployeeId(value);
                  setSubmitError(null);
                }}
                emptyText="No employees in your section."
                icon={<UserRound size={17} color={colors.muted} strokeWidth={2} />}
              />

              <SelectField
                label="Operation"
                placeholder="Select operation"
                value={operationId}
                options={operationOptions}
                onChange={(value) => {
                  setOperationId(value);
                  setSubmitError(null);
                }}
                emptyText="No operations in your section."
                icon={
                  <ClipboardList
                    size={17}
                    color={colors.muted}
                    strokeWidth={2}
                  />
                }
              />

              {operationId ? (
                <View style={styles.workDetails}>
                  <View style={styles.divider} />
                  <TextField
                    label="Lot number"
                    required
                    placeholder="For example, P-1042"
                    value={lotNo}
                    onChangeText={(value) => {
                      setLotNo(value);
                      setSubmitError(null);
                    }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={40}
                    editable={!submitting}
                    returnKeyType="done"
                  />

                  <View style={styles.quantityBlock}>
                    <FieldLabel label="Quantity" required />
                    <QuantityStepper
                      value={quantity}
                      onChange={(value) => {
                        setQuantity(value);
                        setSubmitError(null);
                      }}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.tipRow}>
                  <Text style={styles.tipText}>
                    Lot number and quantity will appear after you choose an
                    operation.
                  </Text>
                </View>
              )}

              <ErrorBanner message={submitError} />

              <PrimaryButton
                label="Submit entry"
                onPress={handleSubmit}
                loading={submitting}
                disabled={
                  !employeeId ||
                  !operationId ||
                  !lotNo.trim() ||
                  quantity < 1 ||
                  quantity > 1_000_000
                }
              />
              {selectedEmployee ? (
                <Text style={styles.submitHint}>
                  Entry will be saved for {selectedEmployee.name}.
                </Text>
              ) : null}
            </View>
            )}

            <View style={styles.recentBlock}>
              <SectionHeader
                title="Recent entries"
                actionLabel="View all"
                onAction={() => navigation.navigate("History")}
              />
              {recentEntries.length > 0 ? (
                recentEntries.map((entry) => (
                  <WorkEntryRow key={entry.id} entry={entry} />
                ))
              ) : (
                <EmptyState
                  title="No entries yet"
                  message="Your submitted work entries will appear here."
                />
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    backgroundColor: colors.canvas,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.muted,
    marginTop: 1,
    fontWeight: "500",
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  centerLoading: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 11.5,
    color: colors.muted,
    fontWeight: "500",
  },
  loadErrorWrap: {
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "stretch",
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing.md,
    minHeight: 106,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  statIconBlue: {
    backgroundColor: colors.rmgSoft,
  },
  statValue: {
    fontSize: 23,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.6,
    lineHeight: 27,
  },
  statLabel: {
    fontSize: 10.5,
    color: colors.muted,
    fontWeight: "500",
    marginTop: 1,
  },
  sectionMini: {
    width: 88,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing.md,
    justifyContent: "center",
    gap: spacing.sm,
  },
  sectionMiniText: {
    fontSize: 10.5,
    lineHeight: 14,
    color: colors.muted,
    fontWeight: "600",
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  formIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  formTitleWrap: {
    flex: 1,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.3,
  },
  formSub: {
    fontSize: 10.5,
    color: colors.muted,
    lineHeight: 15,
    marginTop: 2,
  },
  workDetails: {
    gap: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.lineSoft,
    marginTop: -2,
  },
  quantityBlock: {
    gap: 7,
  },
  tipRow: {
    backgroundColor: colors.primaryTint,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  tipText: {
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.primaryDark,
    fontWeight: "500",
  },
  submitHint: {
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.faint,
    textAlign: "center",
    marginTop: -4,
  },
  recentBlock: {
    paddingTop: spacing.xs,
  },
});
