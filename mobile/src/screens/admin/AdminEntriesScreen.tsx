import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
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
import { ErrorBanner, TextField } from "../../components/Form";
import { ScreenHeader } from "../../components/ScreenHeader";
import { SelectField } from "../../components/SelectSheet";
import { WorkEntryRow } from "../../components/WorkEntryRow";
import { colors, radii, shadow, spacing } from "../../constants/theme";
import { useToast } from "../../context/ToastContext";
import {
  deliverReport,
  type ReportAction,
} from "../../services/reportDelivery";
import type { AdminTabParamList } from "../../navigation/types";
import { data } from "../../services/data";
import {
  calculateRangeInclusiveDays,
  formatDisplayDate,
  getCombinedReportRange,
  parseDisplayDate,
  reportDepartmentLabel,
} from "../../utils/report";
import type { Department, Operation, WorkEntry } from "../../types";
import { errorMessage } from "../../utils/format";

type Props = BottomTabScreenProps<AdminTabParamList, "Entries">;
type Filter = Department;

const sectionFilter = "PETTICOAT" as const;

function formatDateInput(input: string) {
  const digits = input.replace(/[^0-9]/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function AdminEntriesScreen({}: Props) {
  const [entries, setEntries] = useState<WorkEntry[] | null>(null);
  const [filter] = useState<Filter>(sectionFilter);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportFilter, setReportFilter] = useState<Filter>(sectionFilter);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportAction, setReportAction] = useState<ReportAction | null>(null);
  const [reportMode, setReportMode] = useState<"combined" | "custom">("combined");
  const [reportStatus, setReportStatus] = useState<"completed" | "uncompleted">(
    "completed",
  );
  const [operations, setOperations] = useState<Operation[]>([]);
  const [selectedOperationId, setSelectedOperationId] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const loadedOnce = useRef(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!reportOpen) return;

    let mounted = true;
    data.operations()
      .then((result) => {
        if (mounted) {
          setOperations(result.filter((operation) => operation.isActive));
        }
      })
      .catch(() => {
        if (mounted) setOperations([]);
      });

    return () => {
      mounted = false;
    };
  }, [reportOpen]);

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

  const filteredEntries = entries || [];

  const normalizedOperations = operations;

  const operationOptions = [
    { value: "all", label: "All operations", hint: "Every operation" },
    ...normalizedOperations.map((operation) => ({
      value: operation.id,
      label: operation.name,
      hint: "Petticoat",
    })),
  ];

  const reportRange =
    reportMode === "combined"
      ? getCombinedReportRange()
      : (() => {
          const from = parseDisplayDate(customFrom);
          const to = parseDisplayDate(customTo);
          if (!from || !to) {
            return { from: "", to: "", dateLabel: "Choose the dates" };
          }
          return {
            from,
            to,
            dateLabel: `${formatDisplayDate(from)} – ${formatDisplayDate(to)}`,
          };
        })();

  function openReportSheet() {
    setReportMode("combined");
    setReportStatus("completed");
    setSelectedOperationId("all");
    setReportError(null);
    setReportOpen(true);
  }

  function validateReportRange(): string | null {
    if (reportMode === "combined") return null;

    const from = parseDisplayDate(customFrom);
    const to = parseDisplayDate(customTo);
    if (!from || !to) {
      return "Enter valid dates in DD/MM/YYYY format.";
    }
    if (from > to) {
      return "The start date cannot be after the end date.";
    }
    const days = calculateRangeInclusiveDays(from, to);
    if (days > 31) {
      return "The selected report period cannot exceed 31 calendar days.";
    }
    return null;
  }

  async function runReport(action: ReportAction) {
    const validationError = validateReportRange();
    if (validationError) {
      setReportError(validationError);
      return;
    }

    setReportAction(action);
    setReportError(null);

    try {
      const department = reportFilter;
      const file = await data.adminEmployeeReport({
        from: reportRange.from,
        to: reportRange.to,
        department,
        operationId: selectedOperationId,
        status: reportStatus,
      });

      const selectedOperation = normalizedOperations.find(
        (operation) => operation.id === selectedOperationId,
      );
      const operationLabel = selectedOperation
        ? selectedOperation.name
        : "All operations";
      const departmentName = reportDepartmentLabel(reportFilter);
      const statusLabel =
        reportStatus === "completed" ? "Completed" : "Uncompleted";

      const message = await deliverReport(action, {
        file,
        subjectText: `Silai Saathi ${statusLabel} report | ${reportRange.dateLabel}`,
        bodyText: [
          "Silai Saathi production report",
          `Section: ${departmentName}`,
          `Operation: ${operationLabel}`,
          `Status: ${statusLabel}`,
          `Period: ${reportRange.dateLabel}`,
        ].join("\n"),
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
              message="Manager work entries will show up here."
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
                  Choose 31 days, a date range, status and operation
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

            <Text style={styles.reportSectionLabel}>Report period</Text>
            <View style={styles.modeRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: reportMode === "combined" }}
                onPress={() => setReportMode("combined")}
                disabled={Boolean(reportAction)}
                style={({ pressed }) => [
                  styles.modeChip,
                  reportMode === "combined" && styles.modeChipSelected,
                  { opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    reportMode === "combined" && styles.modeChipTextSelected,
                  ]}
                >
                  31-day combined report
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: reportMode === "custom" }}
                onPress={() => setReportMode("custom")}
                disabled={Boolean(reportAction)}
                style={({ pressed }) => [
                  styles.modeChip,
                  reportMode === "custom" && styles.modeChipSelected,
                  { opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    reportMode === "custom" && styles.modeChipTextSelected,
                  ]}
                >
                  Choose date range
                </Text>
              </Pressable>
            </View>

            {reportMode === "combined" ? (
              <View style={styles.combinedCard}>
                <Text style={styles.combinedTitle}>Last 31 calendar days</Text>
                <Text style={styles.combinedRange}>{reportRange.dateLabel}</Text>
                <Text style={styles.combinedHint}>
                  The report file contains all selected operations in this period.
                </Text>
              </View>
            ) : (
              <View style={styles.customDates}>
                <TextField
                  label="From date"
                  required
                  placeholder="14/11/2026"
                  value={customFrom}
                  onChangeText={(value) => setCustomFrom(formatDateInput(value))}
                  keyboardType="number-pad"
                  maxLength={10}
                  returnKeyType="next"
                  containerStyle={styles.dateField}
                  style={styles.dateInput}
                  textAlign="center"
                />
                <TextField
                  label="To date"
                  required
                  placeholder="18/11/2026"
                  value={customTo}
                  onChangeText={(value) => setCustomTo(formatDateInput(value))}
                  keyboardType="number-pad"
                  maxLength={10}
                  returnKeyType="done"
                  containerStyle={styles.dateField}
                  style={styles.dateInput}
                  textAlign="center"
                />
                <Text style={styles.dateFormatHint}>
                  Type numbers only · slashes are added automatically · maximum 31 days
                </Text>
              </View>
            )}

            <Text style={styles.reportSectionLabel}>Status</Text>
            <View style={styles.statusRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: reportStatus === "completed" }}
                onPress={() => setReportStatus("completed")}
                disabled={Boolean(reportAction)}
                style={({ pressed }) => [
                  styles.statusChip,
                  reportStatus === "completed" && styles.statusChipSelected,
                  { opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <CheckCircle2
                  size={16}
                  color={reportStatus === "completed" ? colors.white : colors.success}
                  strokeWidth={2.2}
                />
                <Text
                  style={[
                    styles.statusChipText,
                    reportStatus === "completed" && styles.statusChipTextSelected,
                  ]}
                >
                  Completed
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: reportStatus === "uncompleted" }}
                onPress={() => setReportStatus("uncompleted")}
                disabled={Boolean(reportAction)}
                style={({ pressed }) => [
                  styles.statusChip,
                  reportStatus === "uncompleted" && styles.statusChipUncompleted,
                  { opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    reportStatus === "uncompleted" && styles.statusChipTextSelected,
                  ]}
                >
                  Uncompleted
                </Text>
              </Pressable>
            </View>

            <SelectField
              label="Operation"
              placeholder="Choose operation"
              value={selectedOperationId}
              options={operationOptions}
              onChange={setSelectedOperationId}
              icon={<FileSpreadsheet size={17} color={colors.muted} strokeWidth={2} />}
            />

            <Text style={styles.reportRangeSummary}>
              {reportRange.dateLabel}
              {reportRange.from ? ` · ${calculateRangeInclusiveDays(reportRange.from, reportRange.to)} days` : ""}
            </Text>

            {reportError ? (
              <View style={styles.reportErrorWrap}>
                <ErrorBanner message={reportError} />
              </View>
            ) : null}

            <View style={styles.reportActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send Excel report on WhatsApp"
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
                    Excel report with recipient selection
                  </Text>
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send Excel report by email"
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
                    Excel report attached to your email draft
                  </Text>
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Download Excel report"
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
                    Excel workbook with operation sheets
                  </Text>
                </View>
              </Pressable>
            </View>

            <Text style={styles.reportNote}>
              Showing only the last 31 calendar days. The report is an Excel
              workbook with operation sheets. WhatsApp and email open the
              device sharing flow with the report attached.
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
  modeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modeChip: {
    flex: 1,
    minHeight: 56,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  modeChipSelected: {
    backgroundColor: colors.admin,
    borderColor: colors.admin,
  },
  modeChipText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  modeChipTextSelected: {
    color: colors.white,
  },
  combinedCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.primaryTint,
    padding: spacing.lg,
    gap: 5,
  },
  combinedTitle: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800",
  },
  combinedRange: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },
  combinedHint: {
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 16,
    fontWeight: "500",
  },
  customDates: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dateField: {
    flex: 1,
    minWidth: 0,
  },
  dateInput: {
    minHeight: 68,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
    letterSpacing: 0.5,
    paddingVertical: 0,
  },
  dateFormatHint: {
    color: colors.faint,
    fontSize: 10,
    lineHeight: 16,
    fontWeight: "500",
    marginTop: 2,
  },
  statusRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statusChip: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "#B7E6CF",
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: spacing.sm,
  },
  statusChipSelected: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  statusChipUncompleted: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  statusChipText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
  },
  statusChipTextSelected: {
    color: colors.white,
  },
  reportRangeSummary: {
    color: colors.muted,
    fontSize: 9.5,
    lineHeight: 14,
    fontWeight: "600",
    textAlign: "center",
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
