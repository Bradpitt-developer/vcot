import React, { useEffect, useState } from "react";
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
import { Info, UserRound, Check } from "lucide-react-native";

import { PrimaryButton } from "../../components/Buttons";
import { DepartmentPicker } from "../../components/DepartmentPicker";
import { ErrorBanner, FieldLabel, TextField } from "../../components/Form";
import { ScreenHeader } from "../../components/ScreenHeader";
import { colors, radii, spacing } from "../../constants/theme";
import { useToast } from "../../context/ToastContext";
import type { AdminStackParamList } from "../../navigation/types";
import { data } from "../../services/data";
import type { Department, Employee, Operation } from "../../types";
import { errorMessage } from "../../utils/format";

type Props = NativeStackScreenProps<AdminStackParamList, "AddEmployee">;

export function AddEmployeeScreen({ navigation }: Props) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [department, setDepartment] = useState<Department>("PETTICOAT");
  const [operations, setOperations] = useState<Operation[]>([]);
  const [operationsLoading, setOperationsLoading] = useState(true);
  const [existingEmployees, setExistingEmployees] = useState<Employee[]>([]);
  const [selectedOperationIds, setSelectedOperationIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadOperations() {
      try {
        const [operationResult, employeeResult] = await Promise.all([
          data.operations(),
          data.employees(),
        ]);
        if (mounted) {
          setOperations(
            operationResult.filter(
              (operation) =>
                operation.isActive && operation.department === "PETTICOAT"
            )
          );
          setExistingEmployees(
            employeeResult.filter(
              (employee) =>
                employee.isActive && employee.department === "PETTICOAT"
            )
          );
        }
      } catch {
        if (mounted) {
          setOperations([]);
          setExistingEmployees([]);
        }
      } finally {
        if (mounted) {
          setOperationsLoading(false);
        }
      }
    }

    void loadOperations();

    return () => {
      mounted = false;
    };
  }, []);

  const normalizedEmployeeName = name.trim().toLowerCase();
  const assignedOperationIds = new Set(
    existingEmployees
      .filter(
        (employee) => employee.name.trim().toLowerCase() === normalizedEmployeeName
      )
      .flatMap((employee) =>
        employee.operations.map((operation) => operation.id)
      )
  );

  useEffect(() => {
    const disabledIds = new Set(
      existingEmployees
        .filter(
          (employee) =>
            employee.name.trim().toLowerCase() === normalizedEmployeeName
        )
        .flatMap((employee) =>
          employee.operations.map((operation) => operation.id)
        )
    );

    setSelectedOperationIds((current) =>
      current.filter((id) => !disabledIds.has(id))
    );
  }, [existingEmployees, normalizedEmployeeName]);

  const disabledOperationNames = operations
    .filter((operation) => assignedOperationIds.has(operation.id))
    .map((operation) => operation.name);

  async function handleCreate() {
    Keyboard.dismiss();
    setError(null);

    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setError("Enter the employee's full name.");
      return;
    }

    if (department === "PETTICOAT" && selectedOperationIds.length === 0) {
      setError("Select at least one Petticoat operation for this employee.");
      return;
    }

    setLoading(true);
    try {
      const operationIds =
        department === "PETTICOAT" ? selectedOperationIds : undefined;
      const employee = await data.createEmployee({
        name: cleanName,
        department,
        operationIds,
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
              onChange={(value) => {
                setDepartment(value);
                setError(null);
              }}
              label="Manager type / section"
            />

            {department === "PETTICOAT" ? (
              <View style={styles.operationsBlock}>
                <FieldLabel
                  label="Operations"
                  required
                  hint="This employee appears when the manager selects these operations"
                />
                {operationsLoading ? (
                  <View style={styles.operationLoading}>
                    <Text style={styles.operationLoadingText}>
                      Loading operations…
                    </Text>
                  </View>
                ) : (
                  <View style={styles.operationWrap}>
                    {operations.map((operation) => {
                      const selected = selectedOperationIds.includes(operation.id);
                      const disabled = assignedOperationIds.has(operation.id);

                      return (
                        <Pressable
                          key={operation.id}
                          accessibilityRole="checkbox"
                          accessibilityState={{
                            checked: selected,
                            disabled,
                          }}
                          disabled={disabled}
                          onPress={() => {
                            setSelectedOperationIds((current) =>
                              current.includes(operation.id)
                                ? current.filter((id) => id !== operation.id)
                                : [...current, operation.id]
                            );
                            setError(null);
                          }}
                          style={({ pressed }) => [
                            styles.operationChip,
                            disabled && styles.operationChipDisabled,
                            selected && styles.operationChipSelected,
                            {
                              opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
                            },
                          ]}
                        >
                          {selected && !disabled ? (
                            <Check
                              size={14}
                              color={colors.white}
                              strokeWidth={2.6}
                            />
                          ) : null}
                          <Text
                            style={[
                              styles.operationChipText,
                              selected && styles.operationChipTextSelected,
                              disabled && styles.operationChipTextDisabled,
                            ]}
                          >
                            {operation.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                    {disabledOperationNames.length > 0 ? (
                      <Text style={styles.disabledOperationHint}>
                        {disabledOperationNames.join(", ")} already assigned to this
                        employee name. Choose another operation.
                      </Text>
                    ) : null}
                    {operations.length === 0 ? (
                      <Text style={styles.noOperations}>
                        No active Petticoat operations are available. Add them
                        from Setup first.
                      </Text>
                    ) : null}
                  </View>
                )}
              </View>
            ) : null}

            <View style={styles.infoRow}>
              <Info size={15} color={colors.info} strokeWidth={2} />
              <Text style={styles.infoText}>
                Petticoat managers will see this employee only when they select one of the assigned operations.
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
  operationsBlock: {
    gap: spacing.sm,
  },
  operationLoading: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  operationLoadingText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "500",
  },
  operationWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  operationChip: {
    minHeight: 34,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  operationChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  operationChipDisabled: {
    backgroundColor: colors.lineSoft,
    borderColor: colors.line,
  },
  disabledOperationHint: {
    color: colors.muted,
    fontSize: 9.5,
    lineHeight: 14,
    fontWeight: "500",
    marginTop: 2,
  },
  operationChipTextDisabled: {
    color: colors.faint,
  },
  operationChipText: {
    color: colors.body,
    fontSize: 11,
    fontWeight: "700",
  },
  operationChipTextSelected: {
    color: colors.white,
  },
  noOperations: {
    color: colors.faint,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "500",
    paddingVertical: spacing.sm,
  },
});
