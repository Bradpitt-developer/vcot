import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";

import { EmptyState } from "../../components/EmptyState";
import { ErrorBanner } from "../../components/Form";
import { ScreenHeader } from "../../components/ScreenHeader";
import { WorkEntryRow } from "../../components/WorkEntryRow";
import { colors, radii, spacing } from "../../constants/theme";
import type { ManagerTabParamList } from "../../navigation/types";
import { data } from "../../services/data";
import type { WorkEntry } from "../../types";
import {
  errorMessage,
  isToday,
  isWithinDays,
} from "../../utils/format";

type Props = BottomTabScreenProps<ManagerTabParamList, "History">;
type Filter = "today" | "week" | "all";

const filters: Array<{ key: Filter; label: string }> = [
  { key: "today", label: "Today" },
  { key: "week", label: "7 days" },
  { key: "all", label: "All" },
];

export function ManagerHistoryScreen({}: Props) {
  const [entries, setEntries] = useState<WorkEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("today");
  const loadedOnce = useRef(false);

  const loadEntries = useCallback(async (options?: { refresh?: boolean }) => {
    if (options?.refresh) setRefreshing(true);
    else if (!loadedOnce.current) setLoading(true);

    try {
      const result = await data.managerEntries(100);
      setEntries(result);
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
      void loadEntries();
    }, [loadEntries])
  );

  const filteredEntries = (entries || []).filter((entry) => {
    if (filter === "today") return isToday(entry.createdAt);
    if (filter === "week") return isWithinDays(entry.createdAt, 7);
    return true;
  });

  const totalPieces = filteredEntries.reduce(
    (sum, entry) => sum + entry.quantity,
    0
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Work history"
        subtitle="Your submitted production entries"
        border={false}
      />

      <View style={styles.toolbar}>
        <View style={styles.filterRow}>
          {filters.map((item) => {
            const selected = filter === item.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setFilter(item.key)}
                style={({ pressed }) => [
                  styles.filterChip,
                  selected && styles.filterChipSelected,
                  { opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    selected && styles.filterTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {filteredEntries.length} entr{filteredEntries.length === 1 ? "y" : "ies"}
          </Text>
          <Text style={styles.summaryDot}>·</Text>
          <Text style={styles.summaryText}>{totalPieces} pieces</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorWrap}>
          <ErrorBanner message={error} />
        </View>
      ) : null}

      {loading && !entries ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading entries…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEntries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <WorkEntryRow entry={item} />}
          contentContainerStyle={[
            styles.listContent,
            filteredEntries.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadEntries({ refresh: true })}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No entries in this period"
              message={
                filter === "today"
                  ? "No work has been submitted today yet."
                  : "Try another filter or submit a new entry."
              }
            />
          }
          ListFooterComponent={
            filteredEntries.length > 0 ? (
              <Text style={styles.footerNote}>
                Showing your latest work entries.
              </Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  toolbar: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  filterChip: {
    flex: 1,
    minHeight: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.muted,
  },
  filterTextSelected: {
    color: colors.white,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 2,
  },
  summaryText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "500",
  },
  summaryDot: {
    fontSize: 11,
    color: colors.faint,
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  footerNote: {
    fontSize: 10.5,
    color: colors.faint,
    textAlign: "center",
    paddingTop: spacing.md,
    fontWeight: "500",
  },
});
