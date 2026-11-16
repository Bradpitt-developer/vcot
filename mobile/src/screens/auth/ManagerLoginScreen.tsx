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
import { Eye, EyeOff, KeyRound, Scissors, Shirt } from "lucide-react-native";

import { PrimaryButton } from "../../components/Buttons";
import { DemoLoginCard } from "../../components/DemoLoginCard";
import { ErrorBanner, TextField } from "../../components/Form";
import { ScreenHeader } from "../../components/ScreenHeader";
import { IS_DEMO } from "../../constants/config";
import {
  colors,
  departmentColors,
  radii,
  spacing,
} from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import type { AuthStackParamList } from "../../navigation/types";
import { errorMessage } from "../../utils/format";

type Props = NativeStackScreenProps<AuthStackParamList, "ManagerLogin">;

export function ManagerLoginScreen({ navigation, route }: Props) {
  const { department } = route.params;
  const palette = departmentColors[department];
  const DepartmentIcon = department === "PETTICOAT" ? Scissors : Shirt;
  const { signInManager } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demoUsername = department === "PETTICOAT" ? "petticoat" : "rmg";
  const demoPassword =
    department === "PETTICOAT" ? "Petticoat@123" : "Rmg@123";

  async function handleLogin() {
    Keyboard.dismiss();
    setError(null);

    if (!username.trim() || !password) {
      setError("Enter your login ID and password.");
      return;
    }

    setLoading(true);
    try {
      await signInManager(department, username.trim(), password);
    } catch (loginError) {
      setError(errorMessage(loginError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScreenHeader
        title="Manager login"
        subtitle={`${palette.label} section`}
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
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: palette.soft, borderColor: palette.soft },
            ]}
          >
            <View
              style={[
                styles.sectionIcon,
                { backgroundColor: colors.surface },
              ]}
            >
              <DepartmentIcon
                size={26}
                color={palette.color}
                strokeWidth={2}
              />
            </View>
            <View style={styles.sectionText}>
              <Text style={styles.sectionEyebrow}>YOU ARE LOGGING IN AS</Text>
              <Text style={[styles.sectionTitle, { color: palette.color }]}>
                {palette.label} Manager
              </Text>
            </View>
          </View>

          <View style={styles.formBlock}>
            <Text style={styles.formTitle}>Enter your login details</Text>
            <Text style={styles.formSub}>
              Use the login ID and password given to you by the admin.
            </Text>

            <ErrorBanner message={error} />

            <TextField
              label="Login ID"
              placeholder="Enter your login ID"
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
              placeholder="Enter your password"
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
              label="Login"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />

            <View style={styles.helpRow}>
              <KeyRound size={13} color={colors.faint} strokeWidth={2} />
              <Text style={styles.helpText}>
                Forgot your password? Ask your admin to reset it.
              </Text>
            </View>
          </View>

          {IS_DEMO ? (
            <DemoLoginCard
              username={demoUsername}
              password={demoPassword}
              onUse={() => {
                setUsername(demoUsername);
                setPassword(demoPassword);
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
  sectionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  sectionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionText: {
    flex: 1,
  },
  sectionEyebrow: {
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: "800",
    color: colors.muted,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
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
    maxWidth: 310,
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
  helpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: -2,
  },
  helpText: {
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.faint,
    fontWeight: "500",
  },
});
