import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Plus, Search, Trash2, KeyRound, ClipboardList, X } from "lucide-react-native";

import { Avatar } from "../../components/Avatar";
import { IconButton, PrimaryButton } from "../../components/Buttons";
import { DepartmentPill } from "../../components/DepartmentPill";
import { EmptyState } from "../../components/EmptyState";
import { ErrorBanner, TextField } from "../../components/Form";
import { ScreenHeader } from "../../components/ScreenHeader";
import { colors, radii, spacing } from "../../constants/theme";
import { useToast } from "../../context/ToastContext";
import type {
  AdminStackParamList,
  AdminTabParamList,
} from "../../navigation/types";
import { data } from "../../services/data";
import type { Employee, Manager, Operation } from "../../types";
import { confirmAction } from "../../utils/confirm";
import { errorMessage } from "../../utils/format";

type Props = BottomTabScreenProps<AdminTabParamList, "Staff">;
type Segment = "managers" | "employees";

export function AdminStaffScreen({ navigation }: Props) {
  const { showToast } = useToast();
  const [segment, setSegment] = useState<Segment>("managers");
  const [managers, setManagers] = useState<Manager[] | null>(null);
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetManager, setResetManager] = useState<Manager | null>(null);
  const [editOperationsEmployee, setEditOperationsEmployee] =
    useState<Employee | null>(null);
  const [selectedOperationIds, setSelectedOperationIds] = useState<string[]>([]);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [savingOperations, setSavingOperations] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const loadedOnce = useRef(false);

  const rootNavigation =
    navigation.getParent<NativeStackNavigationProp<AdminStackParamList>>();

  const loadPeople = useCallback(async (options?: { refresh?: boolean; quiet?: boolean }) => {
    if (options?.refresh) setRefreshing(true);
    else if (!loadedOnce.current) setLoading(true);

    try {
      const [managerList, employeeList, operationList] = await Promise.all([
        data.managers(),
        data.employees(),
        data.operations(),
      ]);
      setManagers(managerList);
      setEmployees(employeeList);
      setOperations(
        operationList.filter(
          (operation) =>
            operation.isActive && operation.department === "PETTICOAT"
        )
      );
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
      void loadPeople({ quiet: loadedOnce.current });
    }, [loadPeople])
  );

  const normalizedQuery = query.trim().toLowerCase();

  const filteredManagers = useMemo(
    () =>
      (managers || []).filter((manager) => {
        if (!normalizedQuery) return true;
        return (
          manager.name.toLowerCase().includes(normalizedQuery) ||
          manager.username.toLowerCase().includes(normalizedQuery)
        );
      }),
    [managers, normalizedQuery]
  );

  const filteredEmployees = useMemo(
    () =>
      (employees || []).filter((employee) =>
        employee.name.toLowerCase().includes(normalizedQuery)
      ),
    [employees, normalizedQuery]
  );

  const activeManagers = (managers || []).filter((manager) => manager.isActive).length;
  const activeEmployees = (employees || []).filter((employee) => employee.isActive).length;

  function openAddForm() {
    rootNavigation?.navigate(
      segment === "managers" ? "AddManager" : "AddEmployee"
    );
  }

  async function confirmManagerDelete(manager: Manager) {
    const confirmed = await confirmAction({
      title: "Delete manager?",
      message: `${manager.name}'s login will be permanently deleted. This is only possible when they have not submitted work entries. This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!confirmed) return;

    setBusyId(manager.id);
    try {
      await data.deleteManager(manager.id);
      setManagers((current) =>
        (current || []).filter((item) => item.id !== manager.id)
      );
      showToast(`${manager.name} deleted.`, "success");
    } catch (deleteError) {
      showToast(errorMessage(deleteError), "error");
    } finally {
      setBusyId(null);
    }
  }

  function openManagerPasswordReset(manager: Manager) {
    setResetManager(manager);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
  }

  function closeManagerPasswordReset() {
    setResetManager(null);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
    setSavingPassword(false);
  }

  async function resetManagerPassword() {
    if (!resetManager) return;

    const password = newPassword.trim();
    const confirmation = confirmPassword.trim();

    if (password.length < 4 || password.length > 72) {
      setPasswordError("Use at least 4 characters.");
      return;
    }
    if (password !== confirmation) {
      setPasswordError("The two passwords do not match.");
      return;
    }

    setSavingPassword(true);
    setPasswordError(null);

    try {
      await data.updateManager(resetManager.id, { password });
      setManagers((current) =>
        (current || []).map((item) =>
          item.id === resetManager.id ? item : item
        )
      );
      showToast(`Password reset for ${resetManager.name}.`, "success");
      closeManagerPasswordReset();
    } catch (resetError) {
      setPasswordError(errorMessage(resetError));
    } finally {
      setSavingPassword(false);
    }
  }

  function openEmployeeOperationsEdit(employee: Employee) {
    if (employee.department !== "PETTICOAT") {
      showToast("Operation assignments are for Petticoat employees only.", "info");
      return;
    }

    setEditOperationsEmployee(employee);
    setSelectedOperationIds(employee.operations.map((operation) => operation.id));
    setOperationError(null);
  }

  function closeEmployeeOperationsEdit() {
    setEditOperationsEmployee(null);
    setSelectedOperationIds([]);
    setOperationError(null);
    setSavingOperations(false);
  }

  async function saveEmployeeOperations() {
    if (!editOperationsEmployee) return;

    if (selectedOperationIds.length === 0) {
      setOperationError("Select at least one operation for this employee.");
      return;
    }

    setSavingOperations(true);
    setOperationError(null);

    try {
      const updated = await data.updateEmployee(editOperationsEmployee.id, {
        operationIds: selectedOperationIds,
      });
      setEmployees((current) =>
        (current || []).map((item) =>
          item.id === updated.id ? updated : item
        )
      );
      showToast(`${updated.name}'s operations updated.`, "success");
      closeEmployeeOperationsEdit();
    } catch (operationUpdateError) {
      setOperationError(errorMessage(operationUpdateError));
    } finally {
      setSavingOperations(false);
    }
  }

  async function confirmEmployeeDelete(employee: Employee) {
    const confirmed = await confirmAction({
      title: "Delete employee?",
      message: `${employee.name} will be permanently deleted. This is only possible when they have not been included in work entries. This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!confirmed) return;

    setBusyId(employee.id);
    try {
      await data.deleteEmployee(employee.id);
      setEmployees((current) =>
        (current || []).filter((item) => item.id !== employee.id)
      );
      showToast(`${employee.name} deleted.`, "success");
    } catch (deleteError) {
      showToast(errorMessage(deleteError), "error");
    } finally {
      setBusyId(null);
    }
  }

  const listData: Array<Manager | Employee> =
    segment === "managers" ? filteredManagers : filteredEmployees;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="People"
        subtitle={`${activeManagers} managers · ${activeEmployees} employees active`}
        right={
          <IconButton
            icon={<Plus size={20} color={colors.white} strokeWidth={2.4} />}
            onPress={openAddForm}
            accessibilityLabel={
              segment === "managers" ? "Add manager" : "Add employee"
            }
            tone="soft"
            style={styles.addButton}
          />
        }
        border={false}
      />

      <View style={styles.controls}>
        <View style={styles.segmentWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: segment === "managers" }}
            onPress={() => setSegment("managers")}
            style={[
              styles.segment,
              segment === "managers" && styles.segmentSelected,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                segment === "managers" && styles.segmentTextSelected,
              ]}
            >
              Managers
            </Text>
            <View
              style={[
                styles.countBadge,
                segment === "managers" && styles.countBadgeSelected,
              ]}
            >
              <Text
                style={[
                  styles.countText,
                  segment === "managers" && styles.countTextSelected,
                ]}
              >
                {(managers || []).length}
              </Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: segment === "employees" }}
            onPress={() => setSegment("employees")}
            style={[
              styles.segment,
              segment === "employees" && styles.segmentSelected,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                segment === "employees" && styles.segmentTextSelected,
              ]}
            >
              Employees
            </Text>
            <View
              style={[
                styles.countBadge,
                segment === "employees" && styles.countBadgeSelected,
              ]}
            >
              <Text
                style={[
                  styles.countText,
                  segment === "employees" && styles.countTextSelected,
                ]}
              >
                {(employees || []).length}
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <Search size={17} color={colors.muted} strokeWidth={2.2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${segment}`}
            placeholderTextColor={colors.faint}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query ? (
            <Pressable
              onPress={() => setQuery("")}
              hitSlop={8}
              accessibilityLabel="Clear search"
            >
              <X size={16} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={openAddForm}
          style={({ pressed }) => [
            styles.addInline,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Plus size={15} color={colors.primary} strokeWidth={2.5} />
          <Text style={styles.addInlineText}>
            {segment === "managers" ? "Add a new manager" : "Add a new employee"}
          </Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorWrap}>
          <ErrorBanner message={error} />
        </View>
      ) : null}

      {loading && !managers ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading people…</Text>
        </View>
      ) : (
        <FlatList
          key={segment}
          data={listData}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            listData.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadPeople({ refresh: true })}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) =>
            segment === "managers" ? (
              <ManagerRow
                manager={item as unknown as Manager}
                busy={busyId === item.id}
                onResetPassword={() =>
                  openManagerPasswordReset(item as unknown as Manager)
                }
                onDelete={() =>
                  void confirmManagerDelete(item as unknown as Manager)
                }
              />
            ) : (
              <EmployeeRow
                employee={item as Employee}
                busy={busyId === item.id}
                onEditOperations={() =>
                  openEmployeeOperationsEdit(item as Employee)
                }
                onDelete={() => void confirmEmployeeDelete(item as Employee)}
              />
            )
          }
          ListEmptyComponent={
            <EmptyState
              title={
                normalizedQuery
                  ? "No matches found"
                  : segment === "managers"
                    ? "No managers yet"
                    : "No employees yet"
              }
              message={
                normalizedQuery
                  ? "Try a different name or login ID."
                  : segment === "managers"
                    ? "Create a Petticoat manager login to get started."
                    : "Add employees so managers can select them."
              }
            />
          }
        />
      )}

      <Modal
        visible={Boolean(resetManager)}
        transparent
        animationType="fade"
        onRequestClose={closeManagerPasswordReset}
      >
        <View style={styles.resetBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close password reset"
            style={StyleSheet.absoluteFill}
            onPress={closeManagerPasswordReset}
          />
          <View style={styles.resetCard}>
            <View style={styles.resetHeader}>
              <View style={styles.resetHeaderIcon}>
                <KeyRound size={20} color={colors.primaryDark} strokeWidth={2.2} />
              </View>
              <View style={styles.resetHeaderText}>
                <Text style={styles.resetTitle}>Reset manager password</Text>
                <Text style={styles.resetSubtitle} numberOfLines={1}>
                  {resetManager?.name}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close password reset"
                onPress={closeManagerPasswordReset}
                style={({ pressed }) => [
                  styles.resetCloseButton,
                  pressed && styles.resetCloseButtonPressed,
                ]}
              >
                <X size={18} color={colors.muted} strokeWidth={2.3} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.resetContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <TextField
                label="New password"
                required
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                value={newPassword}
                onChangeText={(value) => {
                  setNewPassword(value);
                  setPasswordError(null);
                }}
                placeholder="e.g. 10/9/2004 or A123"
                autoComplete="password-new"
                textContentType="newPassword"
              />
              <TextField
                label="Confirm new password"
                required
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  setPasswordError(null);
                }}
                placeholder="Type it again"
                autoComplete="password-new"
                textContentType="newPassword"
              />
              <ErrorBanner message={passwordError} />
              <Text style={styles.resetHint}>
                Letters, digits and slashes are allowed. Use at least 4 characters.
              </Text>
              <View style={styles.resetActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel password reset"
                  disabled={savingPassword}
                  onPress={closeManagerPasswordReset}
                  style={({ pressed }) => [
                    styles.cancelButton,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <PrimaryButton
                  label="Reset password"
                  onPress={() => void resetManagerPassword()}
                  loading={savingPassword}
                  disabled={!newPassword.trim() || !confirmPassword.trim()}
                  icon={<KeyRound size={17} color={colors.white} strokeWidth={2.3} />}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(editOperationsEmployee)}
        transparent
        animationType="fade"
        onRequestClose={closeEmployeeOperationsEdit}
      >
        <View style={styles.resetBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close operations editor"
            style={StyleSheet.absoluteFill}
            onPress={closeEmployeeOperationsEdit}
          />
          <View style={styles.resetCard}>
            <View style={styles.resetHeader}>
              <View style={styles.resetHeaderIcon}>
                <ClipboardList
                  size={20}
                  color={colors.primaryDark}
                  strokeWidth={2.2}
                />
              </View>
              <View style={styles.resetHeaderText}>
                <Text style={styles.resetTitle}>Edit Petticoat operations</Text>
                <Text style={styles.resetSubtitle} numberOfLines={1}>
                  {editOperationsEmployee?.name}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close operations editor"
                onPress={closeEmployeeOperationsEdit}
                style={({ pressed }) => [
                  styles.resetCloseButton,
                  pressed && styles.resetCloseButtonPressed,
                ]}
              >
                <X size={18} color={colors.muted} strokeWidth={2.3} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.resetContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.operationPickerHint}>
                This employee will appear only for the operations selected below.
              </Text>
              <View style={styles.operationWrap}>
                {operations.map((operation) => {
                  const selected = selectedOperationIds.includes(operation.id);

                  return (
                    <Pressable
                      key={operation.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      onPress={() => {
                        setSelectedOperationIds((current) =>
                          current.includes(operation.id)
                            ? current.filter((id) => id !== operation.id)
                            : [...current, operation.id]
                        );
                        setOperationError(null);
                      }}
                      style={({ pressed }) => [
                        styles.operationChip,
                        selected && styles.operationChipSelected,
                        { opacity: pressed ? 0.75 : 1 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.operationChipText,
                          selected && styles.operationChipTextSelected,
                        ]}
                      >
                        {operation.name}
                      </Text>
                    </Pressable>
                  );
                })}
                {operations.length === 0 ? (
                  <Text style={styles.noOperationText}>
                    No active Petticoat operations are available. Add them from Setup.
                  </Text>
                ) : null}
              </View>

              <ErrorBanner message={operationError} />
              <View style={styles.resetActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel operations edit"
                  disabled={savingOperations}
                  onPress={closeEmployeeOperationsEdit}
                  style={({ pressed }) => [
                    styles.cancelButton,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <PrimaryButton
                  label="Save operations"
                  onPress={() => void saveEmployeeOperations()}
                  loading={savingOperations}
                  disabled={selectedOperationIds.length === 0}
                  icon={
                    <ClipboardList
                      size={17}
                      color={colors.white}
                      strokeWidth={2.3}
                    />
                  }
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ManagerRow({
  manager,
  busy,
  onResetPassword,
  onDelete,
}: {
  manager: Manager;
  busy: boolean;
  onResetPassword: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.personCard, !manager.isActive && styles.personCardMuted]}>
      <Avatar
        name={manager.name}
        department={manager.department}
        size={44}
      />
      <View style={styles.personText}>
        <Text style={styles.personName} numberOfLines={1}>
          {manager.name}
        </Text>
        <Text style={styles.personMeta} numberOfLines={1}>
          @{manager.username} · {manager.isActive ? "Active" : "Disabled"}
        </Text>
        <View style={styles.pillWrap}>
          <DepartmentPill department={manager.department} small />
        </View>
      </View>
      <View style={styles.rowActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Reset password for ${manager.name}`}
          disabled={busy}
          onPress={onResetPassword}
          style={({ pressed }) => [
            styles.resetIconButton,
            { opacity: busy ? 0.35 : pressed ? 0.65 : 1 },
          ]}
        >
          <KeyRound size={17} color={colors.primaryDark} strokeWidth={2.2} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete manager ${manager.name}`}
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            { opacity: busy ? 0.35 : pressed ? 0.65 : 1 },
          ]}
        >
          <Trash2 size={19} color={colors.danger} strokeWidth={2.2} />
        </Pressable>
      </View>
    </View>
  );
}

function EmployeeRow({
  employee,
  busy,
  onEditOperations,
  onDelete,
}: {
  employee: Employee;
  busy: boolean;
  onEditOperations: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.personCard, !employee.isActive && styles.personCardMuted]}>
      <Avatar name={employee.name} department={employee.department} size={44} />
      <View style={styles.personText}>
        <Text style={styles.personName} numberOfLines={1}>
          {employee.name}
        </Text>
        <Text style={styles.personMeta} numberOfLines={1}>
          {employee.isActive ? "Active employee" : "Disabled employee"}
        </Text>
        {employee.department === "PETTICOAT" ? (
          <Text style={styles.operationMeta} numberOfLines={2}>
            {employee.operations.length > 0
              ? employee.operations.map((operation) => operation.name).join(" · ")
              : "No operation assigned"}
          </Text>
        ) : null}
        <View style={styles.pillWrap}>
          <DepartmentPill department={employee.department} small />
        </View>
      </View>
      <View style={styles.rowActions}>
        {employee.department === "PETTICOAT" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit operations for ${employee.name}`}
            disabled={busy}
            onPress={onEditOperations}
            style={({ pressed }) => [
              styles.resetIconButton,
              { opacity: busy ? 0.35 : pressed ? 0.65 : 1 },
            ]}
          >
            <ClipboardList
              size={17}
              color={colors.primaryDark}
              strokeWidth={2.2}
            />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete employee ${employee.name}`}
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            { opacity: busy ? 0.35 : pressed ? 0.65 : 1 },
          ]}
        >
          <Trash2 size={19} color={colors.danger} strokeWidth={2.2} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  addButton: {
    backgroundColor: colors.primary,
  },
  controls: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  segmentWrap: {
    flexDirection: "row",
    backgroundColor: colors.lineSoft,
    borderRadius: radii.md,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 40,
    borderRadius: radii.sm,
  },
  segmentSelected: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
  },
  segmentTextSelected: {
    color: colors.ink,
  },
  countBadge: {
    minWidth: 18,
    height: 17,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeSelected: {
    backgroundColor: colors.primarySoft,
  },
  countText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.muted,
  },
  countTextSelected: {
    color: colors.primaryDark,
  },
  searchWrap: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: colors.ink,
    paddingVertical: 0,
  },
  addInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  addInlineText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "700",
  },
  errorWrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 11.5,
    color: colors.muted,
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  personCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  personCardMuted: {
    opacity: 0.66,
  },
  personText: {
    flex: 1,
    gap: 1,
  },
  personName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
  },
  personMeta: {
    fontSize: 10.5,
    color: colors.muted,
    fontWeight: "500",
  },
  pillWrap: {
    marginTop: 4,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: "#F3C5C0",
    alignItems: "center",
    justifyContent: "center",
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  resetIconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  resetBackdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.xl,
  },
  resetCard: {
    maxHeight: "88%",
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    overflow: "hidden",
  },
  resetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  resetHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  resetHeaderText: {
    flex: 1,
  },
  resetTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  resetSubtitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  resetCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.line,
  },
  resetCloseButtonPressed: {
    backgroundColor: colors.lineSoft,
  },
  resetContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  resetHint: {
    color: colors.faint,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "500",
  },
  operationMeta: {
    color: colors.muted,
    fontSize: 9.5,
    fontWeight: "500",
    lineHeight: 14,
    marginTop: 2,
  },
  operationPickerHint: {
    color: colors.faint,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "500",
  },
  operationWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  operationChip: {
    minHeight: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  operationChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  operationChipText: {
    color: colors.body,
    fontSize: 11,
    fontWeight: "700",
  },
  operationChipTextSelected: {
    color: colors.white,
  },
  noOperationText: {
    color: colors.faint,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "500",
  },
  resetActions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvas,
  },
  cancelButtonText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
});
