import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  Box,
  ChevronRight,
  ClipboardList,
  Plus,
  ShieldCheck,
  UserRound,
  Users,
  Wrench,
} from "lucide-react-native";

import { Avatar } from "../../components/Avatar";
import { PrimaryButton } from "../../components/Buttons";
import { EmptyState } from "../../components/EmptyState";
import { ErrorBanner } from "../../components/Form";
import { SectionHeader } from "../../components/SectionHeader";
import { WorkEntryRow } from "../../components/WorkEntryRow";
import { colors, radii, shadow, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import type {
  AdminStackParamList,
  AdminTabParamList,
} from "../../navigation/types";
import { data } from "../../services/data";
import type { AdminDashboardData } from "../../types";
import { errorMessage, firstName } from "../../utils/format";

type Props = BottomTabScreenProps<AdminTabParamList, "Home">;

const quickActions: Array<{
  label: string;
  hint: string;
  icon: typeof UserRound;
  target: "AddManager" | "AddEmployee" | "AddOperation";
}> = [
  {
    label: "Add manager",
    hint: "Create a Petticoat manager login",
    icon: UserRound,
    target: "AddManager",
  },
  {
    label: "Add employee",
    hint: "Add a worker to a manager's dropdown",
    icon: Users,
    target: "AddEmployee",
  },
  {
    label: "Add operation",
    hint: "Create a work option for a section",
    icon: Wrench,
    target: "AddOperation",
  },
];

export function AdminHomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const rootNavigation =
    navigation.getParent<NativeStackNavigationProp<AdminStackParamList>>();

  const loadDashboard = useCallback(async (options?: { refresh?: boolean; quiet?: boolean }) => {
    if (options?.refresh) setRefreshing(true);
    else if (!loadedOnce.current) setLoading(true);

    try {
      const result = await data.adminDashboard();
      setDashboard(result);
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
      void loadDashboard({ quiet: loadedOnce.current });
    }, [loadDashboard])
  );

  const stats = dashboard?.stats;
  const recentEntries = dashboard?.recentEntries || [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.adminTag}>
            <ShieldCheck size={12} color={colors.primaryDark} strokeWidth={2.4} />
            <Text style={styles.adminTagText}>ADMIN</Text>
          </View>
          <Text style={styles.greeting}>Namaste, {firstName(user?.name || "Admin")}</Text>
          <Text style={styles.headerSub}>Here is your factory at a glance.</Text>
        </View>
        <Avatar name={user?.name || "Admin"} admin size={46} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadDashboard({ refresh: true })}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {loading && !dashboard ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading dashboard…</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorWrap}>
            <ErrorBanner message={error} />
            <PrimaryButton
              label="Try again"
              compact
              variant="outline"
              onPress={() => void loadDashboard()}
            />
          </View>
        ) : null}

        {dashboard && stats ? (
          <>
            <View style={styles.section}>
              <SectionHeader title="Today's overview" />
              <View style={styles.statsGrid}>
                <StatCard
                  icon={<UserRound size={18} color={colors.petticoat} strokeWidth={2.2} />}
                  iconBackground={colors.petticoatSoft}
                  value={stats.activeManagers}
                  label="Active managers"
                />
                <StatCard
                  icon={<Users size={18} color={colors.rmg} strokeWidth={2.2} />}
                  iconBackground={colors.rmgSoft}
                  value={stats.activeEmployees}
                  label="Active employees"
                />
                <StatCard
                  icon={<ClipboardList size={18} color={colors.primaryDark} strokeWidth={2.2} />}
                  iconBackground={colors.primarySoft}
                  value={stats.todayEntries}
                  label="Entries today"
                />
                <StatCard
                  icon={<Box size={18} color={colors.warning} strokeWidth={2.2} />}
                  iconBackground={colors.warningSoft}
                  value={stats.todayPieces}
                  label="Pieces today"
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Manage operations"
                onPress={() => navigation.navigate("Setup")}
                style={({ pressed }) => [
                  styles.operationsStrip,
                  { opacity: pressed ? 0.74 : 1 },
                ]}
              >
                <Wrench size={15} color={colors.muted} strokeWidth={2.1} />
                <Text style={styles.operationsText}>
                  {stats.activeOperations} active operation
                  {stats.activeOperations === 1 ? "" : "s"}
                </Text>
                <Text style={styles.operationsLink}>Manage</Text>
                <ChevronRight size={14} color={colors.primary} strokeWidth={2.3} />
              </Pressable>
            </View>

            <View style={styles.section}>
              <SectionHeader title="Quick add" />
              <View style={styles.quickCard}>
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Pressable
                      key={action.target}
                      accessibilityRole="button"
                      accessibilityLabel={action.label}
                      onPress={() => rootNavigation?.navigate(action.target)}
                      style={({ pressed }) => [
                        styles.quickRow,
                        index < quickActions.length - 1 && styles.quickRowBorder,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <View style={styles.quickIcon}>
                        <Icon size={19} color={colors.primaryDark} strokeWidth={2.1} />
                      </View>
                      <View style={styles.quickText}>
                        <Text style={styles.quickLabel}>{action.label}</Text>
                        <Text style={styles.quickHint}>{action.hint}</Text>
                      </View>
                      <View style={styles.addCircle}>
                        <Plus size={15} color={colors.primaryDark} strokeWidth={2.6} />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <SectionHeader
                title="Recent entries"
                actionLabel="View all"
                onAction={() => navigation.navigate("Entries")}
              />
              {recentEntries.length > 0 ? (
                recentEntries.map((entry) => (
                  <WorkEntryRow
                    key={entry.id}
                    entry={entry}
                    showManager
                  />
                ))
              ) : (
                <EmptyState
                  title="No work entries yet"
                  message="Entries submitted by managers will appear here."
                />
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  iconBackground,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconBackground: string;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: iconBackground }]}>
        {icon}
      </View>
      <View style={styles.statText}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
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
  },
  headerText: {
    flex: 1,
  },
  adminTag: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 5,
  },
  adminTagText: {
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: colors.primaryDark,
  },
  greeting: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
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
  errorWrap: {
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  section: {
    gap: 0,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statCard: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 74,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statText: {
    flex: 1,
  },
  statValue: {
    fontSize: 21,
    lineHeight: 25,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 9.5,
    lineHeight: 13,
    color: colors.muted,
    fontWeight: "500",
  },
  operationsStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  operationsText: {
    flex: 1,
    fontSize: 10.5,
    color: colors.muted,
    fontWeight: "500",
  },
  operationsLink: {
    fontSize: 10.5,
    color: colors.primary,
    fontWeight: "700",
  },
  quickCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingHorizontal: spacing.md,
    ...shadow.soft,
  },
  quickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 62,
  },
  quickRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  quickText: {
    flex: 1,
  },
  quickLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  quickHint: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.muted,
    marginTop: 2,
  },
  addCircle: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
});
