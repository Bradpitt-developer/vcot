import React, { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Eye, EyeOff, Info, Share2 } from "lucide-react-native";

import { PrimaryButton } from "../../components/Buttons";
import { DepartmentPicker } from "../../components/DepartmentPicker";
import { ErrorBanner, TextField } from "../../components/Form";
import { ScreenHeader } from "../../components/ScreenHeader";
import { colors, radii, spacing } from "../../constants/theme";
import { useToast } from "../../context/ToastContext";
import type { AdminStackParamList } from "../../navigation/types";
import { data } from "../../services/data";
import type { Department } from "../../types";
import { errorMessage } from "../../utils/format";

type Props = NativeStackScreenProps<AdminStackParamList, "AddManager">;

const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;

export function AddManagerScreen({ navigation }: Props) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState<Department>("PETTICOAT");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    Keyboard.dismiss();
    setError(null);

    const cleanName = name.trim();
    const cleanUsername = username.trim().toLowerCase();

    if (cleanName.length < 2) {
      setError("Enter the manager's full name.");
      return;
    }
    if (!USERNAME_PATTERN.test(cleanUsername)) {
      setError(
        "Login ID must be 3-32 characters and can only contain letters, numbers, dots, dashes and underscores."
      );
      return;
    }
    if (password.trim().length < 4 || password.length > 72) {
      setError("Password must be at least 4 characters long.");
      return;
    }

    setLoading(true);
    try {
      const manager = await data.createManager({
        name: cleanName,
        username: cleanUsername,
        password,
        department,
      });
      showToast(
        `${manager.name} created. Share the login details with them.`,
        "success"
      );
      navigation.goBack();
    } catch (createError) {
      setError(errorMessage(createError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScreenHeader
        title="Add manager"
        subtitle="Create a section login"
        onBack={() => navigation.goBack()}
        border={false}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Share2 size={19} color={colors.primaryDark} strokeWidth={2.1} />
            </View>
            <View style={styles.introTextWrap}>
              <Text style={styles.introTitle}>A login for your manager</Text>
              <Text style={styles.introText}>
                After saving, share the login ID and password with the manager.
                They can then sign in from the Petticoat option.
              </Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <ErrorBanner message={error} />

            <TextField
              label="Manager name"
              required
              placeholder="For example, Ramesh Yadav"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!loading}
              returnKeyType="next"
              maxLength={80}
            />

            <DepartmentPicker
              value={department}
              onChange={setDepartment}
              label="Designation / manager type"
            />

            <TextField
              label="Login ID"
              required
              hint="Lowercase, 3-32 characters"
              placeholder="For example, ramesh.petticoat"
              value={username}
              onChangeText={(value) =>
                setUsername(value.toLowerCase().replace(/\s+/g, ""))
              }
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username-new"
              editable={!loading}
              returnKeyType="next"
              maxLength={32}
            />

            <TextField
              label="Password"
              required
              hint="At least 4 characters"
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password-new"
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
              maxLength={72}
              rightAccessory={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? "Hide password" : "Show password"
                  }
                  onPress={() => setShowPassword((current) => !current)}
                  hitSlop={8}
                >
                  {showPassword ? (
                    <EyeOff size={19} color={colors.muted} strokeWidth={2} />
                  ) : (
                    <Eye size={19} color={colors.muted} strokeWidth={2} />
                  )}
                </Pressable>
              }
            />

            <View style={styles.infoRow}>
              <Info size={15} color={colors.info} strokeWidth={2} />
              <Text style={styles.infoText}>
                This manager will see employees and operations from the Petticoat section.
              </Text>
            </View>

            <PrimaryButton
              label="Create manager"
              onPress={handleCreate}
              loading={loading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  introCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: colors.primaryTint,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  introIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  introTextWrap: {
    flex: 1,
  },
  introTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  introText: {
    fontSize: 10.5,
    lineHeight: 16,
    color: colors.body,
    marginTop: 3,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.infoSoft,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.body,
  },
});
