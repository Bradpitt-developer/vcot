import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CheckCircle2,
  ClipboardPenLine,
  Lock,
  UserRound,
} from "lucide-react-native";

import { Avatar } from "../../components/Avatar";
import { PrimaryButton } from "../../components/Buttons";
import { EmptyState } from "../../components/EmptyState";
import { ErrorBanner, FieldLabel, TextField } from "../../components/Form";
import { QuantityStepper } from "../../components/QuantityStepper";
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
  const [activeLot, setActiveLot] = useState<ProductionLot | null>(null);
  const [lotLoading, setLotLoading] = useState(false);
  const [lotError, setLotError] = useState<string | null>(null);
  const [lotNo, setLotNo] = useState("");
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [meter, setMeter] = useState("");
  const [area, setArea] = useState("");
  const [width, setWidth] = useState("");
  const [panel, setPanel] = useState("");
  const [remarks, setRemarks] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const operationMap = useMemo(
    () => new Map(home.operations.map((operation) => [operation.name.toLowerCase(), operation])),
    [home.operations]
  );

  const availableOperations = useMemo(
    () =>
      activeLot
        ? activeLot.availableOperations
            .map((name) => operationMap.get(name.toLowerCase()))
            .filter((operation): operation is (typeof home.operations)[number] => Boolean(operation))
        : [],
    [activeLot, home.operations, operationMap]
  );

  const operationOptions: SelectOption[] = availableOperations.map((operation) => ({
    value: operation.id,
    label: operation.name,
    hint: "Next step",
  }));

  const cuttingOperation = home.operations.find(
    (operation) => operation.name.toLowerCase() === "cutting"
  );

  const filterOperationId = activeLot ? operationId : cuttingOperation?.id;

  const visibleEmployees = filterOperationId
    ? home.employees.filter((employee) =>
        employee.operations.some((operation) => operation.id === filterOperationId)
      )
    : [];

  const filteredEmployeeOptions: SelectOption[] = visibleEmployees.map((employee) => ({
    value: employee.id,
    label: employee.name,
    hint: employee.operations.map((operation) => operation.name).join(", "),
  }));

  const selectedOperation = operationId
    ? home.operations.find((operation) => operation.id === operationId)
    : undefined;

  useEffect(() => {
    if (
      employeeId &&
      !visibleEmployees.some((employee) => employee.id === employeeId)
    ) {
      setEmployeeId(null);
    }
  }, [employeeId, visibleEmployees]);

  useEffect(() => {
    if (
      activeLot &&
      availableOperations.length > 0 &&
      (!operationId ||
        !availableOperations.some((operation) => operation.id === operationId))
    ) {
      setOperationId(availableOperations[0].id);
      return;
    }

    if (!activeLot) {
      setOperationId(null);
    }
  }, [activeLot, availableOperations, operationId]);

  useEffect(() => {
    if (
      employeeId &&
      !home.employees.some((employee) => employee.id === employeeId)
    ) {
      setEmployeeId(null);
    }
  }, [employeeId, home.employees]);

  useEffect(() => {
    const trimmed = lotNo.trim();
    let cancelled = false;

    if (!trimmed) {
      setActiveLot(null);
      setLotLoading(false);
      setLotError(null);
      return () => {
        cancelled = true;
      };
    }

    const timer = setTimeout(async () => {
      setLotLoading(true);
      setLotError(null);

      try {
        const result = await data.managerLot(trimmed);
        if (!cancelled) {
          setActiveLot(result);
        }
      } catch (loadError) {
        if (!cancelled) {
          setActiveLot(null);
          setLotError(errorMessage(loadError));
        }
      } finally {
        if (!cancelled) {
          setLotLoading(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [lotNo]);

  async function handleCreateLot() {
    if (!employeeId) {
      setLotError("Select an employee first.");
      return;
    }

    if (!lotNo.trim()) {
      setLotError("Enter the lot number.");
      return;
    }

    const numbers = [meter, area, width, panel].map((value) =>
      Number(value.replace(/,/g, "").trim())
    );

    if (numbers.some((value) => !Number.isFinite(value) || value < 0)) {
      setLotError("Meter, area, width and panel must be valid numbers.");
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
      setQuantity(1);
      setActiveLot(lot);
      onSaved();
    } catch (createError) {
      setLotError(errorMessage(createError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCompleteStep() {
    if (!activeLot) {
      setLotError("Enter an active lot number first.");
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
        lotId: activeLot.id,
        employeeId,
        operationId,
      });

      showToast(
        updated.status === "completed"
          ? `Lot ${updated.lotNo} completed.`
          : `${selectedOperation?.name || "Step"} saved for lot ${updated.lotNo}.`,
        "success"
      );

      if (updated.status === "completed") {
        setActiveLot(null);
      } else {
        setActiveLot(updated);
      }
      onSaved();
    } catch (completeError) {
      setLotError(errorMessage(completeError));
    } finally {
      setSubmitting(false);
    }
  }

  const shownLotNo = lotNo.trim();
  const completed = new Set(activeLot?.completedOperations || []);

  return (
    <View style={styles.workflowCard}>
      <View style={styles.workflowHeader}>
        <View style={styles.workflowIcon}>
          <ClipboardPenLine size={20} color={colors.primaryDark} strokeWidth={2.2} />
        </View>
        <View style={styles.workflowHeaderText}>
          <Text style={styles.workflowTitle}>Production workflow</Text>
          <Text style={styles.workflowSubtitle}>
            Enter the lot number to continue or start it
          </Text>
        </View>
      </View>

      <TextField
        label="Lot number"
        required
        value={lotNo}
        onChangeText={(value) => {
          setLotNo(value);
          setLotError(null);
        }}
        placeholder="e.g. 7001"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={40}
        returnKeyType="done"
      />

      {lotLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Checking lot {shownLotNo}…</Text>
        </View>
      ) : null}

      {lotError ? (
        <View style={styles.errorWrap}>
          <ErrorBanner message={lotError} />
        </View>
      ) : null}

      {activeLot ? (
        <View style={styles.stepSection}>
          <View style={styles.divider} />
          <View style={styles.stepHeader}>
            <View>
              <Text style={styles.stepEyebrow}>ACTIVE LOT</Text>
              <Text style={styles.stepTitle}>Assign the next step</Text>
            </View>
            <View style={styles.lockedQuantity}>
              <Lock size={13} color={colors.muted} strokeWidth={2.4} />
              <Text style={styles.lockedQuantityText}>{activeLot.quantity} pcs</Text>
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
            label="Next operation"
            placeholder="Select operation"
            value={operationId}
            options={operationOptions}
            onChange={(value) => {
              setOperationId(value);
              setLotError(null);
            }}
            emptyText="No next operation available."
            icon={<ClipboardPenLine size={17} color={colors.muted} strokeWidth={2} />}
          />

          <SelectField
            label="Assign employee"
            placeholder="Select employee"
            value={employeeId}
            options={filteredEmployeeOptions}
            onChange={(value) => {
              setEmployeeId(value);
              setLotError(null);
            }}
            emptyText="No employees assigned to this operation. Admin can add them in People."
            icon={<UserRound size={17} color={colors.muted} strokeWidth={2} />}
          />

          <PrimaryButton
            label={
              availableOperations.length > 0
                ? `Assign ${selectedOperation?.name || "next step"}`
                : "Lot completed"
            }
            onPress={handleCompleteStep}
            loading={submitting}
            disabled={
              !employeeId ||
              !operationId ||
              availableOperations.length === 0
            }
          />
        </View>
      ) : null}

      {!lotLoading && !activeLot && shownLotNo ? (
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
            options={filteredEmployeeOptions}
            onChange={(value) => {
              setEmployeeId(value);
              setLotError(null);
            }}
            emptyText="No employees assigned to this operation. Admin can add them in People."
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

      {!shownLotNo ? (
        <EmptyState
          title="Enter a lot number"
          message="Type 7001 or another lot number to see what is next."
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
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
    lineHeight: 14,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "500",
  },
  errorWrap: {
    marginTop: -spacing.xs,
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
