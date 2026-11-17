import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CheckCircle2,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react-native";

import { Avatar } from "../../components/Avatar";
import { PrimaryButton } from "../../components/Buttons";
import { ErrorBanner, FieldLabel, TextField } from "../../components/Form";
import { colors, radii, spacing } from "../../constants/theme";
import { useToast } from "../../context/ToastContext";
import { data } from "../../services/data";
import type { AdminAccount } from "../../types";
import { confirmAction } from "../../utils/confirm";
import { errorMessage, formatDate } from "../../utils/format";

type Props = {
  visible: boolean;
  onClose: () => void;
  currentUserId?: string;
};

export function AdminManageSheet({ visible, onClose, currentUserId }: Props) {
  const { showToast } = useToast();
  const [mainPassword, setMainPassword] = useState("");
  const [admins, setAdmins] = useState<AdminAccount[] | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setMainPassword("");
      setAdmins(null);
      setUnlocking(false);
      setUnlockError(null);
      setBusyId(null);
      setFormOpen(false);
      setName("");
      setUsername("");
      setPassword("");
      setCreating(false);
      setCreateError(null);
    }
  }, [visible]);

  async function unlockAdmins() {
    if (!mainPassword.trim()) {
      setUnlockError("Enter the main admin password.");
      return;
    }

    setUnlocking(true);
    setUnlockError(null);

    try {
      const result = await data.admins(mainPassword.trim());
      setAdmins(result);
    } catch (error) {
      setUnlockError(errorMessage(error));
    } finally {
      setUnlocking(false);
    }
  }

  async function refreshAdmins() {
    const result = await data.admins(mainPassword.trim());
    setAdmins(result);
  }

  async function createAdmin() {
    const trimmedName = name.trim();
    const trimmedUsername = username.trim().toLowerCase();

    if (trimmedName.length < 2) {
      setCreateError("Enter the admin name.");
      return;
    }
    if (!/^[a-z0-9._-]{3,32}$/.test(trimmedUsername)) {
      setCreateError(
        "Login ID must be 3-32 characters and can contain letters, numbers, dots, dashes and underscores.",
      );
      return;
    }
    if (password.length < 8) {
      setCreateError("Password must be at least 8 characters.");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const admin = await data.createAdmin(
        {
          name: trimmedName,
          username: trimmedUsername,
          password,
        },
        mainPassword.trim(),
      );
      setAdmins((current) => [...(current || []), admin]);
      setName("");
      setUsername("");
      setPassword("");
      setFormOpen(false);
      showToast(`${admin.name} can now log in as admin.`, "success");
    } catch (error) {
      setCreateError(errorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  async function deleteAdmin(admin: AdminAccount) {
    if (admin.id === currentUserId) {
      showToast("You cannot delete your own admin account.", "error");
      return;
    }

    if ((admins || []).length <= 1) {
      showToast("At least one admin account must remain.", "error");
      return;
    }

    const confirmed = await confirmAction({
      title: "Delete admin?",
      message: `${admin.name} will permanently lose admin access.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!confirmed) return;

    setBusyId(admin.id);
    try {
      await data.deleteAdmin(admin.id, mainPassword.trim());
      setAdmins((current) =>
        (current || []).filter((item) => item.id !== admin.id),
      );
      showToast(`${admin.name} deleted.`, "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setBusyId(null);
    }
  }

  const unlocked = admins !== null;

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
          accessibilityLabel="Close admin management"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              {unlocked ? (
                <ShieldCheck
                  size={20}
                  color={colors.admin}
                  strokeWidth={2.1}
                />
              ) : (
                <Lock size={20} color={colors.admin} strokeWidth={2.1} />
              )}
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Manage Admins</Text>
              <Text style={styles.subtitle}>
                {unlocked
                  ? "Add or remove admin accounts"
                  : "Main admin access required"}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close admin management"
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
          >
            {!unlocked ? (
              <>
                <View style={styles.lockCard}>
                  <View style={styles.lockIconWrap}>
                    <Lock size={28} color={colors.admin} strokeWidth={2.1} />
                  </View>
                  <Text style={styles.lockTitle}>Main admin access</Text>
                  <Text style={styles.lockHint}>
                    Enter the main admin password to view, add or delete
                    administrator accounts.
                  </Text>
                </View>

                <TextField
                  label="Main admin password"
                  required
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={() => void unlockAdmins()}
                  value={mainPassword}
                  onChangeText={(value) => {
                    setMainPassword(value);
                    setUnlockError(null);
                  }}
                  placeholder="Enter main admin password"
                />

                <ErrorBanner message={unlockError} />

                <PrimaryButton
                  label="Unlock admin management"
                  onPress={() => void unlockAdmins()}
                  loading={unlocking}
                  disabled={!mainPassword.trim()}
                  icon={<Lock size={17} color={colors.white} strokeWidth={2.3} />}
                />

                <Text style={styles.securityNote}>
                  This password stays only in this screen and is never saved.
                </Text>
              </>
            ) : (
              <>
                <View style={styles.listSummary}>
                  <View style={styles.summaryTextWrap}>
                    <Text style={styles.listTitle}>
                      {admins.length} admin
                      {admins.length === 1 ? "" : "s"}
                    </Text>
                    <Text style={styles.listSubtitle}>
                      Admins can manage managers, employees, operations and
                      reports.
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      formOpen ? "Cancel adding admin" : "Add admin"
                    }
                    onPress={() => {
                      setFormOpen((current) => !current);
                      setCreateError(null);
                    }}
                    style={({ pressed }) => [
                      styles.addButton,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    {formOpen ? (
                      <X size={17} color={colors.primaryDark} strokeWidth={2.4} />
                    ) : (
                      <Plus size={17} color={colors.primaryDark} strokeWidth={2.4} />
                    )}
                  </Pressable>
                </View>

                {formOpen ? (
                  <View style={styles.createCard}>
                    <Text style={styles.createTitle}>Add admin</Text>
                    <TextField
                      label="Full name"
                      required
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g. Rohan Kumar"
                      autoCapitalize="words"
                    />
                    <TextField
                      label="Login ID"
                      required
                      value={username}
                      onChangeText={(value) => setUsername(value.toLowerCase())}
                      placeholder="e.g. rohan.admin"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TextField
                      label="Password"
                      required
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                      placeholder="At least 8 characters"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <ErrorBanner message={createError} />
                    <PrimaryButton
                      label="Create admin"
                      onPress={() => void createAdmin()}
                      loading={creating}
                      disabled={!name.trim() || !username.trim() || !password}
                    />
                  </View>
                ) : null}

                <View style={styles.adminList}>
                  {admins.map((admin) => {
                    const isSelf = admin.id === currentUserId;
                    const deleteDisabled = isSelf || admins.length <= 1;
                    return (
                      <View key={admin.id} style={styles.adminRow}>
                        <Avatar name={admin.name} admin size={42} />
                        <View style={styles.adminText}>
                          <Text style={styles.adminName} numberOfLines={1}>
                            {admin.name}
                            {isSelf ? " (You)" : ""}
                          </Text>
                          <Text style={styles.adminUsername} numberOfLines={1}>
                            @{admin.username}
                          </Text>
                          <Text style={styles.adminMeta} numberOfLines={1}>
                            Created {formatDate(admin.createdAt)}
                          </Text>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Delete admin ${admin.name}`}
                          accessibilityState={{ disabled: deleteDisabled }}
                          disabled={deleteDisabled || Boolean(busyId)}
                          onPress={() => void deleteAdmin(admin)}
                          style={({ pressed }) => [
                            styles.deleteButton,
                            {
                              opacity:
                                deleteDisabled || busyId
                                  ? 0.35
                                  : pressed
                                    ? 0.65
                                    : 1,
                            },
                          ]}
                        >
                          {busyId === admin.id ? (
                            <ActivityIndicator size="small" color={colors.danger} />
                          ) : (
                            <Trash2
                              size={18}
                              color={colors.danger}
                              strokeWidth={2.2}
                            />
                          )}
                        </Pressable>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.footerBadge}>
                  <CheckCircle2
                    size={14}
                    color={colors.success}
                    strokeWidth={2.2}
                  />
                  <Text style={styles.footerText}>
                    Every change is made live in the admin database.
                  </Text>
                </View>
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
    fontSize: 10.5,
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
  listSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing.md,
  },
  summaryTextWrap: {
    flex: 1,
  },
  listTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  listSubtitle: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 2,
    fontWeight: "500",
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  createCard: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing.md,
  },
  createTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  adminList: {
    gap: spacing.sm,
  },
  adminRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing.md,
  },
  adminText: {
    flex: 1,
    minWidth: 0,
  },
  adminName: {
    color: colors.ink,
    fontSize: 12.5,
    fontWeight: "800",
  },
  adminUsername: {
    color: colors.muted,
    fontSize: 10.5,
    fontWeight: "600",
    marginTop: 1,
  },
  adminMeta: {
    color: colors.faint,
    fontSize: 9.5,
    fontWeight: "500",
    marginTop: 2,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: "#F3C5C0",
  },
  footerBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.xs,
  },
  footerText: {
    color: colors.muted,
    fontSize: 9.5,
    fontWeight: "500",
  },
});
