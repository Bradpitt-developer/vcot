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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";

import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Mail,
  MessageCircle,
  X,
} from "lucide-react-native";
import { EmptyState } from "../../components/EmptyState";
import { ErrorBanner } from "../../components/Form";
import { ScreenHeader } from "../../components/ScreenHeader";
import { WorkEntryRow } from "../../components/WorkEntryRow";
import { colors, radii, shadow, spacing } from "../../constants/theme";
import { useToast } from "../../context/ToastContext";
import { deliverReport, type ReportAction } from "../../services/reportDelivery";
import type { AdminTabParamList } from "../../navigation/types";
import { data } from "../../services/data";
import { getReportDays } from "../../utils/report";
import type { Department, WorkEntry } from "../../types";
import { errorMessage } from "../../utils/format";

type Props = BottomTabScreenProps<AdminTabParamList, "Entries">;
type Filter = "ALL" | Department;

const filters: Array<{ key: Filter; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "PETTICOAT", label: "Petticoat" },
  { key: "RMG", label: "RMG" },
];

export function AdminEntriesScreen({}: Props) {
  const [entries, setEntries] = useState<WorkEntry[] | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportFilter, setReportFilter] = useState<Filter>("ALL");
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportAction, setReportAction] = useState<ReportAction | null>(null);
  const loadedOnce = useRef(false);
  const { showToast } = useToast();
  const reportDays = useMemo(() => getReportDays(31), []);
  const [selectedReportDate, setSelectedReportDate] = useState(
    () => reportDays[0]?.date ?? "",
  );

  const loadEntries = useCallback(async (options?: { refresh?: boolean }) => {
    if (options?.refresh) setRefreshing(true);
    else if (!loadedOnce.current) setLoading(true);

    try {
      const result = await data.entries(undefined, 200);
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

  const filteredEntries =
    filter === "ALL"
      ? entries || []
      : (entries || []).filter((entry) => entry.department === filter);

  const selectedDay =
    reportDays.find((day) => day.date === selectedReportDate) ?? reportDays[0];

  function openReportSheet() {
    setReportFilter(filter);
    setReportError(null);
    setReportOpen(true);
  }

  async function runReport(action: ReportAction) {
    if (!selectedDay) {
      setReportError("Choose a day from the last 31 days first.");
      return;
    }

    setReportAction(action);
    setReportError(null);

    try {
      const department =
        reportFilter === "ALL" ? undefined : reportFilter;
      const reportEntries = await data.adminReportEntries({
        date: selectedDay.date,
        department,
      });

      const message = await deliverReport(action, {
        day: selectedDay,
        department: reportFilter,
        entries: reportEntries,
      });

      showToast(
        message,
        message.toLowerCase().includes("cancelled") ? "info" : "success",
      );
      setReportOpen(false);
    } catch (reportFailure) {
      setReportError(errorMessage(reportFailure));
    } finally {
      setReportAction(null);
    }
  }

  const totalPieces = filteredEntries.reduce(
    (sum, entry) => sum + entry.quantity,
    0
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Work entries"
        subtitle="All production submitted by managers"
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
            {filteredEntries.length} entr
            {filteredEntries.length === 1 ? "y" : "ies"}
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
          renderItem={({ item }) => <WorkEntryRow entry={item} showManager />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            filteredEntries.length === 0 && styles.listContentEmpty,
          ]}
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
              title="No entries here"
              message={
                filter === "ALL"
                  ? "Manager work entries will show up here."
                  : `No ${filter === "PETTICOAT" ? "Petticoat" : "RMG"} entries have been submitted yet.`
              }
            />
          }
          ListFooterComponent={
            filteredEntries.length > 0 ? (
              <Text style={styles.footerNote}>
                Showing the latest 200 entries.
              </Text>
            ) : null
          }
        />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Generate 31-day production report"
        onPress={openReportSheet}
        style={({ pressed }) => [
          styles.generateButton,
          pressed && styles.generateButtonPressed,
        ]}
      >
        <FileSpreadsheet
          size={18}
          color={colors.white}
          strokeWidth={2.2}
        />
        <Text style={styles.generateButtonText}>Generate report</Text>
      </Pressable>

      <Modal
        visible={reportOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setReportOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close report options"
            style={StyleSheet.absoluteFill}
            onPress={() => setReportOpen(false)}
          />

          <View style={styles.reportSheet}>
            <View style={styles.reportHeader}>
              <View style={styles.reportHeaderIcon}>
                <FileSpreadsheet
                  size={20}
                  color={colors.admin}
                  strokeWidth={2.1}
                />
              </View>
              <View style={styles.reportHeaderText}>
                <Text style={styles.reportTitle}>Generate report</Text>
                <Text style={styles.reportSubtitle}>
                  Choose one of the last 31 days
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close report"
                onPress={() => setReportOpen(false)}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.closeButtonPressed,
                ]}
              >
                <X size={18} color={colors.muted} strokeWidth={2.3} />
              </Pressable>
            </View>

            <Text style={styles.reportSectionLabel}>Section</Text>
            <View style={styles.reportFilterRow}>
              {filters.map((item) => {
                const selected = reportFilter === item.key;
                return (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setReportFilter(item.key)}
                    disabled={Boolean(reportAction)}
                    style={({ pressed }) => [
                      styles.reportFilterChip,
                      selected && styles.reportFilterChipSelected,
                      { opacity: pressed ? 0.75 : 1 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.reportFilterText,
                        selected && styles.reportFilterTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.reportSectionLabel}>Day (last 31 days)</Text>
            <ScrollView
              style={styles.dayList}
              contentContainerStyle={styles.dayListContent}
              showsVerticalScrollIndicator={false}
            >
              {reportDays.map((day) => {
                const selected = day.date === selectedDay?.date;
                return (
                  <Pressable
                    key={day.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setSelectedReportDate(day.date)}
                    disabled={Boolean(reportAction)}
                    style={({ pressed }) => [
                      styles.dayRow,
                      selected && styles.dayRowSelected,
                      { opacity: pressed ? 0.75 : 1 },
                    ]}
                  >
                    <View style={styles.dayRowText}>
                      <Text style={styles.dayTitle}>{day.title}</Text>
                      <Text style={styles.dayDate}>{day.dateLabel}</Text>
                    </View>
                    {selected ? (
                      <CheckCircle2
                        size={20}
                        color={colors.success}
                        strokeWidth={2.1}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>

            {reportError ? (
              <View style={styles.reportErrorWrap}>
                <ErrorBanner message={reportError} />
              </View>
            ) : null}

            <View style={styles.reportActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send CSV report on WhatsApp"
                disabled={Boolean(reportAction)}
                onPress={() => void runReport("whatsapp")}
                style={({ pressed }) => [
                  styles.reportAction,
                  styles.whatsappAction,
                  { opacity: pressed || reportAction ? 0.78 : 1 },
                ]}
              >
                {reportAction === "whatsapp" ? (
                  <ActivityIndicator color={colors.success} />
                ) : (
                  <MessageCircle
                    size={21}
                    color={colors.success}
                    strokeWidth={2.2}
                  />
                )}
                <View style={styles.reportActionText}>
                  <Text style={styles.reportActionTitle}>WhatsApp</Text>
                  <Text style={styles.reportActionSub}>
                    CSV report with recipient selection
                  </Text>
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send CSV report by email"
                disabled={Boolean(reportAction)}
                onPress={() => void runReport("email")}
                style={({ pressed }) => [
                  styles.reportAction,
                  styles.emailAction,
                  { opacity: pressed || reportAction ? 0.78 : 1 },
                ]}
              >
                {reportAction === "email" ? (
                  <ActivityIndicator color={colors.info} />
                ) : (
                  <Mail
                    size={21}
                    color={colors.info}
                    strokeWidth={2.2}
                  />
                )}
                <View style={styles.reportActionText}>
                  <Text style={styles.reportActionTitle}>Email</Text>
                  <Text style={styles.reportActionSub}>
                    CSV attached to your email draft
                  </Text>
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Download CSV report"
                disabled={Boolean(reportAction)}
                onPress={() => void runReport("download")}
                style={({ pressed }) => [
                  styles.reportAction,
                  styles.downloadAction,
                  { opacity: pressed || reportAction ? 0.78 : 1 },
                ]}
              >
                {reportAction === "download" ? (
                  <ActivityIndicator color={colors.ink} />
                ) : (
                  <Download
                    size={21}
                    color={colors.ink}
                    strokeWidth={2.2}
                  />
                )}
                <View style={styles.reportActionText}>
                  <Text style={styles.reportActionTitle}>Download</Text>
                  <Text style={styles.reportActionSub}>
                    Excel-compatible CSV file
                  </Text>
                </View>
              </Pressable>
            </View>

            <Text style={styles.reportNote}>
              Showing only the last 31 calendar days. Reports roll forward
              automatically every day. WhatsApp and email open the device
              sharing or email flow with the CSV attached.
            </Text>
          </View>
        </View>
      </Modal>
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
    backgroundColor: colors.admin,
    borderColor: colors.admin,
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
  generateButton: {
    position: "absolute",
    left: spacing.xl,
    right: spacing.xl,
    bottom: spacing.lg,
    minHeight: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.admin,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    ...shadow.raised,
  },
  generateButtonPressed: {
    backgroundColor: "#102E2D",
    transform: [{ scale: 0.99 }],
  },
  generateButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.1,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay,
  },
  reportSheet: {
    maxHeight: "92%",
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    ...shadow.raised,
  },
  reportHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  reportHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.adminSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  reportHeaderText: {
    flex: 1,
  },
  reportTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  reportSubtitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonPressed: {
    backgroundColor: colors.lineSoft,
  },
  reportSectionLabel: {
    color: colors.muted,
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  reportFilterRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  reportFilterChip: {
    flex: 1,
    minHeight: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  reportFilterChipSelected: {
    backgroundColor: colors.admin,
    borderColor: colors.admin,
  },
  reportFilterText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  reportFilterTextSelected: {
    color: colors.white,
  },
  dayList: {
    maxHeight: 220,
  },
  dayListContent: {
    gap: spacing.sm,
  },
  dayRow: {
    minHeight: 54,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  dayRowSelected: {
    borderColor: colors.success,
    backgroundColor: colors.successSoft,
  },
  dayRowText: {
    flex: 1,
  },
  dayTitle: {
    color: colors.ink,
    fontSize: 11.5,
    fontWeight: "800",
  },
  dayDate: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  reportErrorWrap: {
    marginTop: -spacing.xs,
  },
  reportActions: {
    gap: spacing.sm,
  },
  reportAction: {
    minHeight: 56,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  whatsappAction: {
    backgroundColor: colors.successSoft,
    borderColor: "#B7E6CF",
  },
  emailAction: {
    backgroundColor: colors.infoSoft,
    borderColor: "#CBDDFF",
  },
  downloadAction: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
  },
  reportActionText: {
    flex: 1,
  },
  reportActionTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
  },
  reportActionSub: {
    color: colors.muted,
    fontSize: 9.5,
    fontWeight: "500",
    marginTop: 2,
  },
  reportNote: {
    color: colors.faint,
    fontSize: 9.5,
    lineHeight: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl + 54,
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
