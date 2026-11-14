import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CheckCircle2,
  ClipboardList,
  ClipboardPenLine,
  Lock,
  Plus,
  UserRound,
} from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";

import { Avatar } from "../../components/Avatar";
import { PrimaryButton } from "../../components/Buttons";
import { EmptyState } from "../../components/EmptyState";
import { ErrorBanner, FieldLabel, TextField } from "../../components/Form";
import { QuantityStepper } from "../../components/QuantityStepper";
import { SectionHeader } from "../../components/SectionHeader";
import { SelectField, type SelectOption } from "../../components/SelectSheet";
import { colors, radii, spacing } from "../../constants/theme";
import { useToast } from "../../context/ToastContext";
import { data } from "../../services/data";
import type { ManagerHomeData, ProductionLot } from "../../types";
import { errorMessage } from "../../utils/format";

type Props = {
  home: ManagerHomeData;
  onSaved: () => void;
};

const REQUIRED_OPERATIONS = [
  "Cutting",
  "Interlock",
  "Kamarpatti",
  "Bottom",
  "Dori",
  "Nada",
  "Dhoka",
  "Folding",
] as const;

export function ProductionWorkflowCard({ home, onSaved }: Props) {
  const { showToast } = useToast();
  const [lots, setLots] = useState<ProductionLot[] | null>(null);
  const [lotLoading, setLotLoading] = useState(true);
  const [lotError, setLotError] = useState<string | null>(null);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [showNewLot, setShowNewLot] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [meter, setMeter] = useState("");
  const [area, setArea] = useState("");
  const [width, setWidth] = useState("");
  const [panel, setPanel] = useState("");
  const [remarks, setRemarks] = useState("");
  const [lotNo, setLotNo] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const loadLots = useCallback(async (showLoading = false) => {
    if (showLoading) setLotLoading(true);

    try {
      const result = await data.managerLots();
      setLots(result);
      setLotError(null);

      if (result.length > 0) {
        setSelectedLotId((current) =>
          current && result.some((lot) => lot.id === current)
            ? current
            : result[0].id
        );
      } else {
        setSelectedLotId(null);
      }
    } catch (error) {
      setLotError(errorMessage(error));
    } finally {
      setLotLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadLots();
    }, [loadLots])
  );

  useEffect(() => {
    if (lots && lots.length === 0) {
      setShowNewLot(true);
    }
  }, [lots]);

  useEffect(() => {
    if (!lots) return;
    if (employeeId && !home.employees.some((employee) => employee.id === employeeId)) {
      setEmployeeId(null);
    }
  }, [home.employees, employeeId, lots]);

  const selectedLot = useMemo(
    () => lots?.find((lot) => lot.id === selectedLotId) ?? null,
    [lots, selectedLotId]
  );

  const operationMap = useMemo(
    () => new Map(home.operations.map((operation) => [operation.name.toLowerCase(), operation])),
    [home.operations]
  );

  const availableOperations = useMemo(
    () =>
      selectedLot
        ? selectedLot.availableOperations
            .map((name) => operationMap.get(name.toLowerCase()))
            .filter((operation): operation is (typeof home.operations)[number] => Boolean(operation))
        : [],
    [home.operations, operationMap, selectedLot]
  );

  const employeeOptions: SelectOption[] = home.employees.map((employee) => ({
    value: employee.id,
    label: employee.name,
    hint: employee.department,
  }));

  const selectedOperation = operationId
    ? home.operations.find((operation) => operation.id === operationId)
    : undefined;

  useEffect(() => {
    if (availableOperations.length === 0) {
      setOperationId(null);
      return;
    }

    if (!operationId || !availableOperations.some((operation) => operation.id === operationId)) {
      setOperationId(availableOperations[0].id);
    }
  }, [availableOperations, operationId]);

  async function handleCreateLot() {
    if (!employeeId) {
      setLotError("Select an employee first.");
      return;
    }

    const numbers = [meter, area, width, panel].map((value) =>
      Number(value.replace(/,/g, "").trim())
    );

    if (numbers.some((value) => !Number.isFinite(value) || value < 0)) {
      setLotError("Meter, area, width and panel must be valid numbers.");
      return;
    }

    if (!lotNo.trim()) {
      setLotError("Enter the lot number.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) {
      setLotError("Quantity must be a whole number from 1 to 1,000,000.");
      return;
    }

    setSubmitting(true);
    setLotError(null);

    try {
      const lot = await data.createProductionLot({
        employeeId,
        lotNo: lotNo.trim(),
        meter: numbers[0],
        area: numbers[1],
        width: numbers[2],
        panel: numbers[3],
        remarks: remarks.trim() || undefined,
        quantity,
      });

      showToast(`Lot ${lot.lotNo} started.`, "success");
      setMeter("");
      setArea("");
      setWidth("");
      setPanel("");
      setRemarks("");
      setLotNo("");
      setQuantity(1);
      setShowNewLot(false);
      await loadLots();
      setSelectedLotId(lot.id);
      onSaved();
    } catch (error) {
      setLotError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCompleteStep() {
    if (!selectedLot) {
      setLotError("Select an active lot first.");
      return;
    }

    if (!employeeId || !operationId) {
      setLotError("Select an employee and the next operation.");
      return;
    }

    setSubmitting(true);
    setLotError(null);

    try {
      const updated = await data.completeProductionStep({
        lotId: selectedLot.id,
        employeeId,
        operationId,
      });

      showToast(
        updated.status === "completed"
          ? `Lot ${updated.lotNo} completed.`
          : `${selectedOperation?.name || "Step"} saved for lot ${updated.lotNo}.`,
        "success"
      );
      await loadLots();
      onSaved();
    } catch (error) {
      setLotError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const completed = new Set(selectedLot?.completedOperations || []);
  const operationOptions: SelectOption[] = availableOperations.map((operation) => ({
    value: operation.id,
    label: operation.name,
    hint: "Next step",
  }));

  return (
    <View style={styles.workflowCard}>
      <View style={styles.workflowHeader}>
        <View style={styles.workflowIcon}>
          <ClipboardPenLine size={20} color={colors.primaryDark} strokeWidth={2.2} />
        </View>
        <View style={styles.workflowHeaderText}>
          <Text style={styles.workflowTitle}>Production workflow</Text>
          <Text style={styles.workflowSubtitle}>
            Cutting to Folding · quantity stays locked
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showNewLot ? "Hide new lot form" : "Start a new lot"}
          onPress={() => {
            setShowNewLot((current) => !current);
            setLotError(null);
          }}
          style={({ pressed }) => [
            styles.newLotButton,
            showNewLot && styles.newLotButtonSelected,
            { opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Plus size={18} color={colors.white} strokeWidth={2.5} />
        </Pressable>
      </View>

      {lotError ? (
        <View style={styles.errorWrap}>
          <ErrorBanner message={lotError} />
        </View>
      ) : null}

      {lotLoading && !lots ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading active lots…</Text>
        </View>
      ) : null}

      {lots && lots.length > 0 ? (
        <View style={styles.lotPicker}>
          <Text style={styles.fieldLabel}>Active lots</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.lotScroll}
          >
            {lots.map((lot) => {
              const selected = lot.id === selectedLotId;
              return (
                <Pressable
                  key={lot.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedLotId(lot.id)}
                  style={({ pressed }) => [
                    styles.lotCard,
                    selected && styles.lotCardSelected,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <View style={styles.lotCardTop}>
                    <Text style={styles.lotNo}>{lot.lotNo}</Text>
                    <View style={styles.lockBadge}>
                      <Lock size={10} color={colors.muted} strokeWidth={2.4} />
                      <Text style={styles.lockText}>{lot.quantity} pcs</Text>
                    </View>
                  </View>
                  <Text style={styles.lotStage}>Next: {lot.currentStage}</Text>
                  <View style={styles.lotProgress}>
                    {REQUIRED_OPERATIONS.map((step) => {
                      const done = lot.completedOperations.includes(step);
                      return (
                        <View
                          key={step}
                          style={[styles.progressDot, done && styles.progressDotDone]}
                        />
                      );
                    })}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {selectedLot ? (
        <View style={styles.stepSection}>
          <View style={styles.divider} />
          <View style={styles.stepHeader}>
            <View>
              <Text style={styles.stepEyebrow}>Lot {selectedLot.lotNo}</Text>
              <Text style={styles.stepTitle}>Assign the next step</Text>
            </View>
            <View style={styles.lockedQuantity}>
              <Lock size={13} color={colors.muted} strokeWidth={2.4} />
              <Text style={styles.lockedQuantityText}>{selectedLot.quantity} pcs</Text>
            </View>
          </View>

          <View style={styles.progressList}>
            {REQUIRED_OPERATIONS.map((operation) => {
              const done = completed.has(operation);
              return (
                <View key={operation} style={styles.progressStep}>
                  <CheckCircle2
                    size={14}
                    color={done ? colors.success : colors.faint}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={[
                      styles.progressStepText,
                      done && styles.progressStepDone,
                    ]}
                  >
                    {operation}
                  </Text>
                </View>
              );
            })}
          </View>

          <SelectField
            label="Assign employee"
            placeholder="Select employee"
            value={employeeId}
            options={employeeOptions}
            onChange={(value) => {
              setEmployeeId(value);
              setLotError(null);
            }}
            emptyText="No employees in your section."
            icon={<UserRound size={17} color={colors.muted} strokeWidth={2} />}
          />

          <SelectField
            label="Next operation"
            placeholder="Select operation"
            value={operationId}
            options={operationOptions}
            onChange={(value) => {
              setOperationId(value);
              setLotError(null);
            }}
            emptyText="No next operation is available."
            icon={<ClipboardList size={17} color={colors.muted} strokeWidth={2} />}
          />

          <PrimaryButton
            label={
              availableOperations.length > 0
                ? `Assign ${availableOperations.find(
                    (operation) => operation.id === operationId,
                  )?.name || "next step"}`
                : "Lot completed"
            }
            onPress={handleCompleteStep}
            loading={submitting}
            disabled={!employeeId || !operationId || availableOperations.length === 0}
          />
        </View>
      ) : null}

      {showNewLot ? (
        <View style={styles.newLotSection}>
          <View style={styles.divider} />
          <View style={styles.newLotHeader}>
            <View>
              <Text style={styles.stepEyebrow}>NEW LOT</Text>
              <Text style={styles.stepTitle}>Start with Cutting</Text>
            </View>
            <View style={styles.quantitySummary}>
              <Text style={styles.quantitySummaryLabel}>Quantity</Text>
              <Text style={styles.quantitySummaryValue}>{quantity} pcs</Text>
            </View>
          </View>

          <SelectField
            label="Assign to employee"
            placeholder="Select employee"
            value={employeeId}
            options={employeeOptions}
            onChange={(value) => {
              setEmployeeId(value);
              setLotError(null);
            }}
            emptyText="No employees in your section."
            icon={<UserRound size={17} color={colors.muted} strokeWidth={2} />}
          />

          <View style={styles.twoColumns}>
            <TextField
              label="Meter"
              required
              keyboardType="decimal-pad"
              value={meter}
              onChangeText={setMeter}
              placeholder="e.g. 12.5"
              containerStyle={styles.columnField}
            />
            <TextField
              label="Area"
              required
              keyboardType="decimal-pad"
              value={area}
              onChangeText={setArea}
              placeholder="e.g. 300"
              containerStyle={styles.columnField}
            />
          </View>

          <View style={styles.twoColumns}>
            <TextField
              label="Width"
              required
              keyboardType="decimal-pad"
              value={width}
              onChangeText={setWidth}
              placeholder="e.g. 1.5"
              containerStyle={styles.columnField}
            />
            <TextField
              label="Panel"
              required
              keyboardType="decimal-pad"
              value={panel}
              onChangeText={setPanel}
              placeholder="e.g. 4"
              containerStyle={styles.columnField}
            />
          </View>

          <TextField
            label="Remarks"
            hint="Text and digits"
            value={remarks}
            onChangeText={setRemarks}
            placeholder="e.g. client, fabric or instructions"
            maxLength={300}
            returnKeyType="done"
          />

          <TextField
            label="Lot number"
            required
            placeholder="e.g. 7001"
            value={lotNo}
            onChangeText={setLotNo}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={40}
            returnKeyType="done"
          />

          <View style={styles.quantityBlock}>
            <FieldLabel label="Quantity" required />
            <QuantityStepper value={quantity} onChange={setQuantity} />
          </View>

          <PrimaryButton
            label="Start Cutting"
            onPress={handleCreateLot}
            loading={submitting}
            disabled={
              !employeeId ||
              !lotNo.trim() ||
              quantity < 1 ||
              quantity > 1_000_000
            }
          />
        </View>
      ) : null}

      {lots && lots.length === 0 && !showNewLot ? (
        <EmptyState
          title="No active lot"
          message="Start a new guided lot to record Cutting through Folding."
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  workflowCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing.lg,
    gap: spacing.md,
  },
  workflowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  workflowIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  workflowHeaderText: {
    flex: 1,
  },
  workflowTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  workflowSubtitle: {
    color: colors.muted,
    fontSize: 10.5,
    fontWeight: "500",
    marginTop: 2,
  },
  newLotButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.admin,
    alignItems: "center",
    justifyContent: "center",
  },
  newLotButtonSelected: {
    backgroundColor: colors.primaryDark,
  },
  errorWrap: {
    marginTop: -spacing.xs,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "500",
  },
  lotPicker: {
    gap: spacing.sm,
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  lotScroll: {
    gap: spacing.sm,
    paddingBottom: 2,
  },
  lotCard: {
    width: 148,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvas,
    padding: spacing.md,
    gap: spacing.sm,
  },
  lotCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  lotCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  lotNo: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.lineSoft,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  lockText: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "700",
  },
  lotStage: {
    color: colors.body,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "700",
  },
  lotProgress: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  progressDot: {
    width: 17,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.line,
  },
  progressDotDone: {
    backgroundColor: colors.success,
  },
  stepSection: {
    gap: spacing.md,
  },
  newLotSection: {
    gap: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.lineSoft,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  newLotHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  stepEyebrow: {
    color: colors.primaryDark,
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  stepTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginTop: 2,
  },
  lockedQuantity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  lockedQuantityText: {
    color: colors.muted,
    fontSize: 10.5,
    fontWeight: "800",
  },
  progressList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  progressStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.canvas,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
  },
  progressStepText: {
    color: colors.faint,
    fontSize: 9.5,
    fontWeight: "600",
  },
  progressStepDone: {
    color: colors.success,
    fontWeight: "700",
  },
  quantityBlock: {
    gap: spacing.sm,
  },
  quantitySummary: {
    alignItems: "flex-end",
  },
  quantitySummaryLabel: {
    color: colors.faint,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  quantitySummaryValue: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },
  twoColumns: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  columnField: {
    flex: 1,
  },
});
