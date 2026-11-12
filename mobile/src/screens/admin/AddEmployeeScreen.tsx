import React, { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Info, UserRound } from "lucide-react-native";

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

type Props = NativeStackScreenProps<AdminStackParamList, "AddEmployee">;

export function AddEmployeeScreen({ navigation }: Props) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [department, setDepartment] = useState<Department>("PETTICOAT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    Keyboard.dismiss();
    setError(null);

    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setError("Enter the employee's full name.");
      return;
    }

    setLoading(true);
    try {
      const employee = await data.createEmployee({
        name: cleanName,
        department,
      });
      showToast(`${employee.name} added successfully.`, "success");
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
        title="Add employee"
        subtitle="Add a worker to a section"
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
              <UserRound size={19} color={colors.primaryDark} strokeWidth={2.1} />
            </View>
            <View style={styles.introTextWrap}>
              <Text style={styles.introTitle}>Add an employee</Text>
              <Text style={styles.introText}>
                The employee will appear in the dropdown for managers of the
                selected section.
              </Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <ErrorBanner message={error} />

            <TextField
              label="Employee name"
              required
              placeholder="For example, Anil Kumar"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
              maxLength={80}
            />

            <DepartmentPicker
              value={department}
              onChange={setDepartment}
              label="Manager type / section"
            />

            <View style={styles.infoRow}>
              <Info size={15} color={colors.info} strokeWidth={2} />
              <Text style={styles.infoText}>
                {department === "PETTICOAT" ? "Petticoat" : "RMG"} managers will be
                able to select this employee when adding a work entry.
              </Text>
            </View>

            <PrimaryButton
              label="Add employee"
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
