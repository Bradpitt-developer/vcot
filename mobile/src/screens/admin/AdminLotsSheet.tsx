import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  CheckCircle2,
  ClipboardList,
  Lock,
  Search,
  ShieldCheck,
  X,
} from "lucide-react-native";
import { colors, radii, spacing } from "../../constants/theme";
import { useToast } from "../../context/ToastContext";
import { Avatar } from "../../components/Avatar";
import { PrimaryButton } from "../../components/Buttons";
import { ErrorBanner, TextField } from "../../components/Form";
import { data } from "../../services/data";
import type { AdminProductionLot } from "../../types";
import { errorMessage, formatDate } from "../../utils/format";

type Props = {
  visible: boolean;
  onClose: () => void;
};

type LotStatusFilter = "all" | "active" | "completed";

export function AdminLotsSheet({ visible, onClose }: Props) {
  const { showToast } = useToast();
  const [mainPassword, setMainPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [lots, setLots] = useState<AdminProductionLot[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LotStatusFilter>("all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) {
      setMainPassword("");
      setUnlocked(false);
      setLoading(false);
      setUnlockError(null);
      setLots([]);
      setSearch("");
      setStatus("all");
      setSavingId(null);
      setSaveError(null);
      setDrafts({});
    }
  }, [visible]);

  async function loadLots(options?: {
    status?: LotStatusFilter;
    searchText?: string;
    currentPassword?: string;
  }) {
    const searchText = options?.searchText ?? search;
    const nextStatus = options?.status ?? status;
    const password = options?.currentPassword ?? mainPassword.trim();

    if (!password) return;

    setLoading(true);
    setSaveError(null);

    try {
      const result = await data.adminLots(password, {
        status: nextStatus,
        search: searchText,
      });
      setLots(result);
      setDrafts(
        Object.fromEntries(
          result.map((lot) => [lot.id, String(lot.quantity)]),
        ),
      );
    } catch (loadError) {
      setUnlockError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!unlocked) return;

    const timeout = setTimeout(() => {
      void loadLots({
        status,
        searchText: search,
        currentPassword: mainPassword.trim(),
      });
    }, 250);

    return () => clearTimeout(timeout);
  }, [search, status, unlocked]);

  async function unlockLots() {
    if (!mainPassword.trim()) {
      setUnlockError("Enter the main admin password.");
      return;
    }

    setLoading(true);
    setUnlockError(null);

    try {
      const result = await data.adminLots(mainPassword.trim(), {
        status: "all",
        search: "",
      });
      setLots(result);
      setDrafts(
        Object.fromEntries(
          result.map((lot) => [lot.id, String(lot.quantity)]),
        ),
      );
      setUnlocked(true);
    } catch (unlockFailure) {
      setUnlockError(errorMessage(unlockFailure));
    } finally {
      setLoading(false);
    }
  }

  async function saveQuantity(lot: AdminProductionLot) {
    const raw = drafts[lot.id];
    const quantity = Number(raw);

    if (
      raw === undefined ||
      raw === "" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 1_000_000
    ) {
      setSaveError("Enter a whole quantity from 1 to 1,000,000.");
      return;
    }

    setSavingId(lot.id);
    setSaveError(null);

    try {
      const updated = await data.updateAdminLot(
        lot.id,
        quantity,
        mainPassword.trim(),
      );
      setLots((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setDrafts((current) => ({
        ...current,
        [lot.id]: String(updated.quantity),
      }));
      showToast(
        `Lot ${updated.lotNo} updated from ${lot.quantity} to ${updated.quantity} pcs.`,
        "success",
      );
    } catch (saveFailure) {
      setSaveError(errorMessage(saveFailure));
    } finally {
      setSavingId(null);
    }
  }

  const filteredCount = lots.length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close manage lots"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <ClipboardList size={20} color={colors.admin} strokeWidth={2.1} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Manage Lots</Text>
              <Text style={styles.subtitle}>
                Correct lot quantities and see who created them
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close manage lots"
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed,
              ]}
            >
              <X size={18} color={colors.muted} strokeWidth={2.3} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {!unlocked ? (
              <>
                <View style={styles.lockCard}>
                  <View style={styles.lockIconWrap}>
                    <Lock size={28} color={colors.admin} strokeWidth={2.1} />
                  </View>
                  <Text style={styles.lockTitle}>Main admin access</Text>
                  <Text style={styles.lockHint}>
                    Enter the main admin password to view and correct lots.
                  </Text>
                </View>

                <TextField
                  label="Main admin password"
                  required
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={mainPassword}
                  onChangeText={(value) => {
                    setMainPassword(value);
                    setUnlockError(null);
                  }}
                  onSubmitEditing={() => void unlockLots()}
                  returnKeyType="done"
                  placeholder="Enter main admin password"
                />

                <ErrorBanner message={unlockError} />

                <PrimaryButton
                  label="Unlock lot management"
                  onPress={() => void unlockLots()}
                  loading={loading}
                  disabled={!mainPassword.trim()}
                  icon={<ShieldCheck size={17} color={colors.white} strokeWidth={2.3} />}
                />

                <Text style={styles.securityNote}>
                  This password stays only in this screen and is never saved.
                </Text>
              </>
            ) : (
              <>
                <View style={styles.searchCard}>
                  <Search size={17} color={colors.muted} strokeWidth={2.2} />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search lot number or manager"
                    placeholderTextColor={colors.faint}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                    style={styles.searchInput}
                  />
                </View>

                <View style={styles.statusRow}>
                  {(["all", "active", "completed"] as LotStatusFilter[]).map(
                    (item) => {
                      const selected = status === item;
                      return (
                        <Pressable
                          key={item}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => setStatus(item)}
                          style={({ pressed }) => [
                            styles.statusChip,
                            selected && styles.statusChipSelected,
                            { opacity: pressed ? 0.75 : 1 },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusChipText,
                              selected && styles.statusChipTextSelected,
                            ]}
                          >
                            {item === "all"
                              ? "All"
                              : item === "active"
                                ? "Active"
                                : "Completed"}
                          </Text>
                        </Pressable>
                      );
                    },
                  )}
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryTitle}>
                    {filteredCount} lot{filteredCount === 1 ? "" : "s"} shown
                  </Text>
                  <Text style={styles.summaryHint}>Latest 100 matching lots</Text>
                </View>

                <ErrorBanner message={saveError} />

                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.loadingText}>Loading lots…</Text>
                  </View>
                ) : lots.length > 0 ? (
                  <View style={styles.lotList}>
                    {lots.map((lot) => {
                      const draft = drafts[lot.id] ?? String(lot.quantity);
                      const saving = savingId === lot.id;

                      return (
                        <View key={lot.id} style={styles.lotCard}>
                          <View style={styles.lotTop}>
                            <Avatar
                              name={lot.managerName}
                              department={lot.managerDepartment}
                              size={40}
                            />
                            <View style={styles.lotTextWrap}>
                              <View style={styles.lotTitleRow}>
                                <Text style={styles.lotNumber}>Lot {lot.lotNo}</Text>
                                <View
                                  style={[
                                    styles.lotStatusBadge,
                                    lot.status === "completed" && styles.completedBadge,
                                  ]}
                                >
                                  {lot.status === "completed" ? (
                                    <CheckCircle2
                                      size={11}
                                      color={colors.success}
                                      strokeWidth={2.3}
                                    />
                                  ) : (
                                    <Lock
                                      size={11}
                                      color={colors.muted}
                                      strokeWidth={2.3}
                                    />
                                  )}
                                  <Text style={styles.lotStatusBadgeText}>
                                    {lot.status === "completed" ? "Completed" : "Active"}
                                  </Text>
                                </View>
                              </View>
                              <Text style={styles.lotManager} numberOfLines={1}>
                                @{lot.managerUsername} · {lot.managerName}
                              </Text>
                              <Text style={styles.lotMeta} numberOfLines={2}>
                                Created {formatDate(lot.createdAt)} · {lot.entryCount} record
                                {lot.entryCount === 1 ? "" : "s"} · Meter {lot.meter} · Area {lot.area}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.lotDetailsRow}>
                            <View style={styles.lotDetail}>
                              <Text style={styles.detailLabel}>Width</Text>
                              <Text style={styles.detailValue}>{lot.width}</Text>
                            </View>
                            <View style={styles.lotDetail}>
                              <Text style={styles.detailLabel}>Panel</Text>
                              <Text style={styles.detailValue}>{lot.panel}</Text>
                            </View>
                            <View style={styles.lotDetail}>
                              <Text style={styles.detailLabel}>Remarks</Text>
                              <Text style={styles.detailValue} numberOfLines={1}>
                                {lot.remarks || "—"}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.quantityEdit}>
                            <View style={styles.quantityText}>
                              <Text style={styles.detailLabel}>Quantity</Text>
                            </View>
                            <TextInput
                              value={draft}
                              onChangeText={(value) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [lot.id]: value.replace(/[^0-9]/g, ""),
                                }))
                              }
                              keyboardType="number-pad"
                              inputMode="numeric"
                              maxLength={7}
                              selectTextOnFocus
                              style={styles.quantityInput}
                              accessibilityLabel={`Quantity for lot ${lot.lotNo}`}
                            />
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Save quantity for lot ${lot.lotNo}`}
                              disabled={saving}
                              onPress={() => void saveQuantity(lot)}
                              style={({ pressed }) => [
                                styles.saveButton,
                                { opacity: saving || pressed ? 0.75 : 1 },
                              ]}
                            >
                              {saving ? (
                                <ActivityIndicator color={colors.white} />
                              ) : (
                                <Text style={styles.saveButtonText}>Save</Text>
                              )}
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <ClipboardList size={34} color={colors.muted} strokeWidth={1.7} />
                    <Text style={styles.emptyTitle}>No matching lots</Text>
                    <Text style={styles.emptyMessage}>
                      No lot has matched “{search || "this filter"}”.
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay,
  },
  sheet: {
    maxHeight: "94%",
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.adminSoft,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "500",
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  closeButtonPressed: {
    backgroundColor: colors.lineSoft,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  lockCard: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  lockIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.adminSoft,
  },
  lockTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  lockHint: {
    color: colors.muted,
    fontSize: 11.5,
    lineHeight: 17,
    textAlign: "center",
    fontWeight: "500",
  },
  securityNote: {
    color: colors.faint,
    fontSize: 9.5,
    lineHeight: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  searchCard: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
    paddingVertical: 0,
  },
  statusRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statusChip: {
    flex: 1,
    minHeight: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  statusChipSelected: {
    backgroundColor: colors.admin,
    borderColor: colors.admin,
  },
  statusChipText: {
    color: colors.muted,
    fontSize: 10.5,
    fontWeight: "700",
  },
  statusChipTextSelected: {
    color: colors.white,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  summaryTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
  },
  summaryHint: {
    color: colors.faint,
    fontSize: 9,
    fontWeight: "500",
  },
  loadingRow: {
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "500",
  },
  lotList: {
    gap: spacing.sm,
  },
  lotCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing.md,
    gap: spacing.sm,
  },
  lotTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  lotTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  lotTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  lotNumber: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  lotStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 7,
    paddingVertical: 4,
    backgroundColor: colors.canvas,
  },
  completedBadge: {
    borderColor: "#BDE7D1",
    backgroundColor: colors.successSoft,
  },
  lotStatusBadgeText: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  lotManager: {
    color: colors.body,
    fontSize: 10.5,
    fontWeight: "700",
    marginTop: 2,
  },
  lotMeta: {
    color: colors.muted,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  lotDetailsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  lotDetail: {
    flex: 1,
    minWidth: 0,
  },
  detailLabel: {
    color: colors.faint,
    fontSize: 8.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  detailValue: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  quantityEdit: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  quantityText: {
    flex: 1,
  },
  quantityInput: {
    minWidth: 92,
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.sm,
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  saveButton: {
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.admin,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  emptyMessage: {
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 15,
    textAlign: "center",
    fontWeight: "500",
  },
});
