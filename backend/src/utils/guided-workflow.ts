export const GUIDED_OPERATIONS = [
  "Cutting",
  "Interlock",
  "Kamarpatti",
  "Bottom",
  "Dori",
  "Nada",
  "Dhoka",
  "Folding",
] as const;

export type GuidedOperation = (typeof GUIDED_OPERATIONS)[number];

export const MIDDLE_OPERATIONS: readonly GuidedOperation[] = [
  "Kamarpatti",
  "Bottom",
  "Dori",
  "Nada",
];

export type GuidedWorkflowState = {
  completedOperations: GuidedOperation[];
  availableOperations: GuidedOperation[];
  currentStage: string;
  isComplete: boolean;
};

function toGuidedOperation(value: string): GuidedOperation | null {
  const normalized = value.trim().toLowerCase();
  return (
    GUIDED_OPERATIONS.find(
      (operation) => operation.toLowerCase() === normalized,
    ) ?? null
  );
}

export function guidedWorkflowState(
  completedOperationNames: string[],
): GuidedWorkflowState {
  const completedSet = new Set<GuidedOperation>(
    completedOperationNames
      .map(toGuidedOperation)
      .filter((operation): operation is GuidedOperation => operation !== null),
  );

  const completedOperations = GUIDED_OPERATIONS.filter((operation) =>
    completedSet.has(operation),
  );

  const missingMiddle = MIDDLE_OPERATIONS.filter(
    (operation) => !completedSet.has(operation),
  );

  let availableOperations: GuidedOperation[] = [];

  if (!completedSet.has("Interlock")) {
    availableOperations = ["Interlock"];
  } else if (missingMiddle.length > 0) {
    availableOperations = missingMiddle;
  } else if (!completedSet.has("Dhoka")) {
    availableOperations = ["Dhoka"];
  } else if (!completedSet.has("Folding")) {
    availableOperations = ["Folding"];
  }

  const currentStage = availableOperations.length
    ? availableOperations.length > 1
      ? MIDDLE_OPERATIONS.join(" / ")
      : availableOperations[0]
    : "Completed";

  return {
    completedOperations,
    availableOperations,
    currentStage,
    isComplete: availableOperations.length === 0,
  };
}
