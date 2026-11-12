import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Plus, Search, Trash2, X } from "lucide-react-native";

import { Avatar } from "../../components/Avatar";
import { IconButton } from "../../components/Buttons";
import { DepartmentPill } from "../../components/DepartmentPill";
import { EmptyState } from "../../components/EmptyState";
import { ErrorBanner } from "../../components/Form";
import { ScreenHeader } from "../../components/ScreenHeader";
import { colors, radii, spacing } from "../../constants/theme";
import { useToast } from "../../context/ToastContext";
import type {
  AdminStackParamList,
  AdminTabParamList,
} from "../../navigation/types";
import { data } from "../../services/data";
import type { Employee, Manager } from "../../types";
import { confirmAction } from "../../utils/confirm";
import { errorMessage } from "../../utils/format";

type Props = BottomTabScreenProps<AdminTabParamList, "Staff">;
type Segment = "managers" | "employees";

export function AdminStaffScreen({ navigation }: Props) {
  const { showToast } = useToast();
  const [segment, setSegment] = useState<Segment>("managers");
  const [managers, setManagers] = useState<Manager[] | null>(null);
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const rootNavigation =
    navigation.getParent<NativeStackNavigationProp<AdminStackParamList>>();

  const loadPeople = useCallback(async (options?: { refresh?: boolean; quiet?: boolean }) => {
    if (options?.refresh) setRefreshing(true);
    else if (!loadedOnce.current) setLoading(true);

    try {
      const [managerList, employeeList] = await Promise.all([
        data.managers(),
        data.employees(),
      ]);
      setManagers(managerList);
      setEmployees(employeeList);
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

  const listData =
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
                manager={item as Manager}
                busy={busyId === item.id}
                onDelete={() => void confirmManagerDelete(item as Manager)}
              />
            ) : (
              <EmployeeRow
                employee={item as Employee}
                busy={busyId === item.id}
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
                    ? "Create a Petticoat or RMG manager login to get started."
                    : "Add employees so managers can select them."
              }
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function ManagerRow({
  manager,
  busy,
  onDelete,
}: {
  manager: Manager;
  busy: boolean;
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
  );
}

function EmployeeRow({
  employee,
  busy,
  onDelete,
}: {
  employee: Employee;
  busy: boolean;
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
        <View style={styles.pillWrap}>
          <DepartmentPill department={employee.department} small />
        </View>
      </View>
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
});
