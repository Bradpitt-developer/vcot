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
import { Eye, EyeOff, ShieldCheck } from "lucide-react-native";

import { PrimaryButton } from "../../components/Buttons";
import { DemoLoginCard } from "../../components/DemoLoginCard";
import { ErrorBanner, TextField } from "../../components/Form";
import { ScreenHeader } from "../../components/ScreenHeader";
import { IS_DEMO } from "../../constants/config";
import { colors, radii, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import type { AuthStackParamList } from "../../navigation/types";
import { errorMessage } from "../../utils/format";

type Props = NativeStackScreenProps<AuthStackParamList, "AdminLogin">;

export function AdminLoginScreen({ navigation }: Props) {
  const { signInAdmin } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    Keyboard.dismiss();
    setError(null);

    if (!username.trim() || !password) {
      setError("Enter your admin login ID and password.");
      return;
    }

    setLoading(true);
    try {
      await signInAdmin(username.trim(), password);
    } catch (loginError) {
      setError(errorMessage(loginError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScreenHeader
        title="Admin login"
        subtitle="Factory administration"
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
          <View style={styles.adminCard}>
            <View style={styles.adminIcon}>
              <ShieldCheck size={26} color={colors.white} strokeWidth={2} />
            </View>
            <View style={styles.adminTextWrap}>
              <Text style={styles.adminEyebrow}>ADMIN ACCESS</Text>
              <Text style={styles.adminTitle}>Factory admin</Text>
              <Text style={styles.adminHint}>
                Manage managers, employees and operations.
              </Text>
            </View>
          </View>

          <View style={styles.formBlock}>
            <Text style={styles.formTitle}>Sign in as admin</Text>
            <Text style={styles.formSub}>
              This area is only for the factory administrator.
            </Text>

            <ErrorBanner message={error} />

            <TextField
              label="Login ID"
              placeholder="Enter admin login ID"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              editable={!loading}
              returnKeyType="next"
              containerStyle={styles.field}
            />

            <TextField
              label="Password"
              placeholder="Enter admin password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              containerStyle={styles.field}
              rightAccessory={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? "Hide password" : "Show password"
                  }
                  onPress={() => setShowPassword((current) => !current)}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.eyeButton,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  {showPassword ? (
                    <EyeOff size={19} color={colors.muted} strokeWidth={2} />
                  ) : (
                    <Eye size={19} color={colors.muted} strokeWidth={2} />
                  )}
                </Pressable>
              }
            />

            <PrimaryButton
              label="Login as admin"
              onPress={handleLogin}
              loading={loading}
              variant="dark"
              style={styles.loginButton}
            />
          </View>

          {IS_DEMO ? (
            <DemoLoginCard
              username="admin"
              password="Admin@123"
              onUse={() => {
                setUsername("admin");
                setPassword("Admin@123");
                setError(null);
              }}
            />
          ) : null}
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xxl,
  },
  adminCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.admin,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  adminIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  adminTextWrap: {
    flex: 1,
  },
  adminEyebrow: {
    fontSize: 9,
    letterSpacing: 0.9,
    fontWeight: "800",
    color: "rgba(255,255,255,0.6)",
    marginBottom: 3,
  },
  adminTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.3,
  },
  adminHint: {
    fontSize: 10.5,
    lineHeight: 15,
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },
  formBlock: {
    gap: spacing.lg,
  },
  formTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.5,
  },
  formSub: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
    marginTop: -8,
  },
  field: {
    marginTop: 2,
  },
  eyeButton: {
    padding: 4,
  },
  loginButton: {
    marginTop: spacing.xs,
  },
});
