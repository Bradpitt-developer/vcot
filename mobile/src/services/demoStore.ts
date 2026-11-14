import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  CreateProductionLotInput,
  DataSource,
  Department,
  Employee,
  LoginResult,
  Manager,
  Operation,
  ProductionLot,
  SessionUser,
  WorkEntry,
} from "../types";
import { getSessionToken } from "./session";
import { dateKeyInTimeZone } from "../utils/report";

type DemoUser = SessionUser & {
  password: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
};

type DemoProductionLot = ProductionLot & {
  completedOperations: string[];
};

type DemoDatabase = {
  version: 1 | 2;
  users: DemoUser[];
  employees: Employee[];
  operations: Operation[];
  entries: WorkEntry[];
  productionLots?: DemoProductionLot[];
};

const STORAGE_KEY = "@silai-saathi/demo-db-v1";
const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;

const STARTER_OPERATIONS: Record<Department, string[]> = {
  PETTICOAT: [
    "Cutting",
    "Kamarpatti",
    "Interlock",
    "Bottom",
    "Dhoka",
    "Folding",
    "Dori",
    "Nada",
  ],
  RMG: [
    "Kamarpatti",
    "Interlock",
    "Bottom",
    "Dhoka",
    "Folding",
    "Dori",
    "Nada",
  ],
};

const RETIRED_STARTER_OPERATION_IDS = new Set([
  "op_pet_cutting",
  "op_pet_stitching",
  "op_pet_elastic",
  "op_pet_finishing",
  "op_pet_packing",
  "op_rmg_cutting",
  "op_rmg_stitching",
  "op_rmg_checking",
  "op_rmg_ironing",
  "op_rmg_packing",
]);

function starterOperationId(department: Department, name: string): string {
  return `op_${department.toLowerCase()}_${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")}`;
}

let cache: DemoDatabase | null = null;

class DemoError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "DemoError";
    this.status = status;
  }
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();
}

function isToday(value: string): boolean {
  const date = new Date(value);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function latestFirst(entries: WorkEntry[]): WorkEntry[] {
  return [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function seedDatabase(): DemoDatabase {
  const petticoatManager: DemoUser = {
    id: "mgr_petticoat_demo",
    name: "Ramesh Yadav",
    username: "petticoat",
    password: "Petticoat@123",
    role: "manager",
    department: "PETTICOAT",
    isActive: true,
    createdAt: daysAgo(45),
    lastLoginAt: null,
  };

  const rmgManager: DemoUser = {
    id: "mgr_rmg_demo",
    name: "Sunita Devi",
    username: "rmg",
    password: "Rmg@123",
    role: "manager",
    department: "RMG",
    isActive: true,
    createdAt: daysAgo(40),
    lastLoginAt: null,
  };

  const admin: DemoUser = {
    id: "admin_demo",
    name: "Factory Admin",
    username: "admin",
    password: "Admin@123",
    role: "admin",
    department: null,
    isActive: true,
    createdAt: daysAgo(90),
    lastLoginAt: null,
  };

  const employees: Employee[] = [
    {
      id: "emp_anil",
      name: "Anil Kumar",
      department: "PETTICOAT",
      isActive: true,
      createdAt: daysAgo(35),
    },
    {
      id: "emp_meena",
      name: "Meena Kumari",
      department: "PETTICOAT",
      isActive: true,
      createdAt: daysAgo(32),
    },
    {
      id: "emp_rahul",
      name: "Rahul Singh",
      department: "PETTICOAT",
      isActive: true,
      createdAt: daysAgo(28),
    },
    {
      id: "emp_pooja",
      name: "Pooja Sharma",
      department: "RMG",
      isActive: true,
      createdAt: daysAgo(26),
    },
    {
      id: "emp_vikas",
      name: "Vikas Gupta",
      department: "RMG",
      isActive: true,
      createdAt: daysAgo(22),
    },
    {
      id: "emp_neha",
      name: "Neha Verma",
      department: "RMG",
      isActive: true,
      createdAt: daysAgo(18),
    },
  ];

  const operations: Operation[] = (
    Object.keys(STARTER_OPERATIONS) as Department[]
  ).flatMap((department) =>
    STARTER_OPERATIONS[department].map((name, index) => ({
      id: starterOperationId(department, name),
      name,
      department,
      isActive: true,
      createdAt: daysAgo(44 - index),
    }))
  );

  const entries: WorkEntry[] = [
    {
      id: "entry_seed_1",
      employeeId: "emp_anil",
      employeeName: "Anil Kumar",
      managerId: petticoatManager.id,
      managerName: petticoatManager.name,
      operationId: "op_petticoat_kamarpatti",
      operationName: "Kamarpatti",
      lotNo: "P-1042",
      quantity: 120,
      department: "PETTICOAT",
      createdAt: minutesAgo(55),
    },
    {
      id: "entry_seed_2",
      employeeId: "emp_pooja",
      employeeName: "Pooja Sharma",
      managerId: rmgManager.id,
      managerName: rmgManager.name,
      operationId: "op_rmg_interlock",
      operationName: "Interlock",
      lotNo: "R-208",
      quantity: 200,
      department: "RMG",
      createdAt: minutesAgo(120),
    },
    {
      id: "entry_seed_3",
      employeeId: "emp_meena",
      employeeName: "Meena Kumari",
      managerId: petticoatManager.id,
      managerName: petticoatManager.name,
      operationId: "op_petticoat_bottom",
      operationName: "Bottom",
      lotNo: "P-1039",
      quantity: 85,
      department: "PETTICOAT",
      createdAt: minutesAgo(310),
    },
    {
      id: "entry_seed_4",
      employeeId: "emp_vikas",
      employeeName: "Vikas Gupta",
      managerId: rmgManager.id,
      managerName: rmgManager.name,
      operationId: "op_rmg_folding",
      operationName: "Folding",
      lotNo: "R-207",
      quantity: 144,
      department: "RMG",
      createdAt: daysAgo(1),
    },
    {
      id: "entry_seed_5",
      employeeId: "emp_rahul",
      employeeName: "Rahul Singh",
      managerId: petticoatManager.id,
      managerName: petticoatManager.name,
      operationId: "op_petticoat_dhoka",
      operationName: "Dhoka",
      lotNo: "P-1038",
      quantity: 60,
      department: "PETTICOAT",
      createdAt: daysAgo(1),
    },
  ];

  return {
    version: 2,
    users: [admin, petticoatManager, rmgManager],
    employees,
    operations,
    entries,
  };
}

const GUIDED_OPERATIONS = [
  "Cutting",
  "Interlock",
  "Kamarpatti",
  "Bottom",
  "Dori",
  "Nada",
  "Dhoka",
  "Folding",
] as const;

const MIDDLE_OPERATIONS = ["Kamarpatti", "Bottom", "Dori", "Nada"] as const;

type GuidedOperation = (typeof GUIDED_OPERATIONS)[number];

function guidedWorkflowState(completedOperationNames: string[]) {
  const wanted = new Set(
    completedOperationNames.map((name) => name.trim().toLowerCase()),
  );
  const completed = GUIDED_OPERATIONS.filter((operation) =>
    wanted.has(operation.toLowerCase()),
  );
  const missingMiddle = MIDDLE_OPERATIONS.filter(
    (operation) => !wanted.has(operation.toLowerCase()),
  );

  let availableOperations: GuidedOperation[] = [];

  if (!wanted.has("interlock")) {
    availableOperations = ["Interlock"];
  } else if (missingMiddle.length > 0) {
    availableOperations = [...missingMiddle];
  } else if (!wanted.has("dhoka")) {
    availableOperations = ["Dhoka"];
  } else if (!wanted.has("folding")) {
    availableOperations = ["Folding"];
  }

  return {
    completedOperations: completed,
    availableOperations,
    currentStage: availableOperations.length
      ? availableOperations.length > 1
        ? MIDDLE_OPERATIONS.join(" / ")
        : availableOperations[0]
      : "Completed",
    isComplete: availableOperations.length === 0,
  };
}

function toDemoProductionLot(lot: DemoProductionLot): ProductionLot {
  const state = guidedWorkflowState(lot.completedOperations);

  return {
    ...lot,
    currentStage: state.currentStage,
    completedOperations: state.completedOperations,
    availableOperations: state.availableOperations,
  };
}

function productionLots(db: DemoDatabase): DemoProductionLot[] {
  db.productionLots ??= [];
  return db.productionLots;
}

function migrateOperations(db: DemoDatabase): void {
  const createdAt = new Date().toISOString();

  for (const department of Object.keys(STARTER_OPERATIONS) as Department[]) {
    for (const name of STARTER_OPERATIONS[department]) {
      const exists = db.operations.some(
        (operation) =>
          operation.department === department &&
          operation.name.toLowerCase() === name.toLowerCase()
      );
      if (!exists) {
        db.operations.push({
          id: starterOperationId(department, name),
          name,
          department,
          isActive: true,
          createdAt,
        });
      }
    }
  }

  for (const operation of db.operations) {
    if (RETIRED_STARTER_OPERATION_IDS.has(operation.id)) {
      operation.isActive = false;
    }
  }
}

async function persist(db: DemoDatabase): Promise<void> {
  cache = db;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (error) {
    console.warn("Preview data could not be saved on this device.", error);
  }
}

async function getDatabase(): Promise<DemoDatabase> {
  if (cache) return cache;

  let saved: string | null = null;
  try {
    saved = await AsyncStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Preview data could not be loaded.", error);
  }

  if (saved) {
    try {
      const parsed = JSON.parse(saved) as DemoDatabase;
      if (
        (parsed.version === 1 || parsed.version === 2) &&
        Array.isArray(parsed.users) &&
        Array.isArray(parsed.employees) &&
        Array.isArray(parsed.operations) &&
        Array.isArray(parsed.entries)
      ) {
        if (parsed.version === 1) {
          migrateOperations(parsed);
          parsed.version = 2;
          parsed.productionLots ??= [];
          await persist(parsed);
          return parsed;
        }

        parsed.productionLots ??= [];
        cache = parsed;
        return parsed;
      }
    } catch {
      // A broken preview store is replaced with fresh sample data.
    }
  }

  const seeded = seedDatabase();
  await persist(seeded);
  return seeded;
}

function sessionUser(user: DemoUser): SessionUser {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    department: user.department,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

function managerFromUser(user: DemoUser): Manager {
  if (!user.department) {
    throw new DemoError("Manager department is missing.", 500);
  }
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: "manager",
    department: user.department,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt,
  };
}

function currentUser(db: DemoDatabase): DemoUser {
  const token = getSessionToken();
  if (!token || !token.startsWith("demo:")) {
    throw new DemoError("Please log in to continue.", 401);
  }

  const id = token.slice("demo:".length);
  const user = db.users.find((candidate) => candidate.id === id);
  if (!user || !user.isActive) {
    throw new DemoError("This account is no longer active.", 401);
  }
  return user;
}

function requireAdmin(db: DemoDatabase): DemoUser {
  const user = currentUser(db);
  if (user.role !== "admin") {
    throw new DemoError("You do not have access to this action.", 403);
  }
  return user;
}

function requireManager(db: DemoDatabase): DemoUser {
  const user = currentUser(db);
  if (user.role !== "manager" || !user.department) {
    throw new DemoError("You do not have access to this action.", 403);
  }
  return user;
}

function validateName(value: unknown, label: string, max = 80): string {
  const name = String(value ?? "").trim();
  if (name.length < 2 || name.length > max) {
    throw new DemoError(`${label} must be between 2 and ${max} characters.`);
  }
  return name;
}

function validateUsername(value: unknown): string {
  const username = String(value ?? "").trim().toLowerCase();
  if (!USERNAME_PATTERN.test(username)) {
    throw new DemoError(
      "Login ID must be 3-32 characters and can only contain letters, numbers, dots, dashes and underscores."
    );
  }
  return username;
}

function validatePassword(value: unknown): string {
  if (typeof value !== "string") {
    throw new DemoError("Password is required.");
  }

  const password = value.trim();
  if (password.length < 4 || password.length > 72) {
    throw new DemoError("Password must be at least 4 characters long.");
  }
  return password;
}

function validateDepartment(value: unknown): Department {
  if (value !== "PETTICOAT" && value !== "RMG") {
    throw new DemoError("Department must be Petticoat or RMG.");
  }
  return value;
}

function validateLotNo(value: unknown): string {
  const lotNo = String(value ?? "").trim();
  if (!lotNo || lotNo.length > 40) {
    throw new DemoError("Lot number is required (maximum 40 characters).");
  }
  return lotNo;
}

function validateQuantity(value: unknown): number {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) {
    throw new DemoError("Quantity must be a whole number greater than zero.");
  }
  return quantity;
}

export const demoDataSource: DataSource = {
  async loginAdmin(username, password): Promise<LoginResult> {
    const db = await getDatabase();
    const normalized = username.trim().toLowerCase();
    const user = db.users.find(
      (candidate) =>
        candidate.username === normalized &&
        candidate.role === "admin" &&
        candidate.password === password
    );

    if (!user) {
      throw new DemoError("Invalid admin login ID or password.", 401);
    }
    if (!user.isActive) {
      throw new DemoError("This admin account is disabled.", 403);
    }

    user.lastLoginAt = new Date().toISOString();
    await persist(db);
    return { token: `demo:${user.id}`, user: sessionUser(user) };
  },

  async loginManager(department, username, password): Promise<LoginResult> {
    const db = await getDatabase();
    const selectedDepartment = validateDepartment(department);
    const normalized = username.trim().toLowerCase();
    const user = db.users.find(
      (candidate) =>
        candidate.username === normalized &&
        candidate.role === "manager" &&
        candidate.department === selectedDepartment &&
        candidate.password === password
    );

    if (!user) {
      throw new DemoError("Invalid login ID or password.", 401);
    }
    if (!user.isActive) {
      throw new DemoError(
        "This account is disabled. Please contact your admin.",
        403
      );
    }

    user.lastLoginAt = new Date().toISOString();
    await persist(db);
    return { token: `demo:${user.id}`, user: sessionUser(user) };
  },

  async me(): Promise<SessionUser> {
    const db = await getDatabase();
    return sessionUser(currentUser(db));
  },

  async managerHome() {
    const db = await getDatabase();
    const manager = requireManager(db);
    const department = manager.department as Department;
    const managerEntries = latestFirst(
      db.entries.filter((entry) => entry.managerId === manager.id)
    );
    const today = managerEntries.filter((entry) => isToday(entry.createdAt));

    return {
      employees: db.employees
        .filter(
          (employee) =>
            employee.department === department && employee.isActive
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
      operations: db.operations
        .filter(
          (operation) =>
            operation.department === department && operation.isActive
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
      entries: managerEntries.slice(0, 20),
      stats: {
        todayEntries: today.length,
        todayPieces: today.reduce((sum, entry) => sum + entry.quantity, 0),
      },
    };
  },

  async managerLot(lotNo): Promise<ProductionLot | null> {
    const db = await getDatabase();
    const manager = requireManager(db);
    const department = manager.department as Department;

    if (department !== "PETTICOAT") return null;

    const lot = productionLots(db).find(
      (candidate) =>
        candidate.department === department &&
        candidate.status === "active" &&
        candidate.lotNo.toLowerCase() === lotNo.trim().toLowerCase()
    );

    return lot ? toDemoProductionLot(lot) : null;
  },

  async createProductionLot(input: CreateProductionLotInput) {
    const db = await getDatabase();
    const manager = requireManager(db);
    const department = manager.department as Department;

    if (department !== "PETTICOAT") {
      throw new DemoError(
        "The guided production workflow is available only in Petticoat.",
        403
      );
    }

    const employee = db.employees.find(
      (candidate) => candidate.id === input.employeeId
    );
    if (!employee || !employee.isActive || employee.department !== department) {
      throw new DemoError(
        "That employee is not available in your section.",
        400
      );
    }

    const lotNo = validateLotNo(input.lotNo);
    const duplicate = productionLots(db).some(
      (lot) =>
        lot.status === "active" &&
        lot.department === department &&
        lot.lotNo.toLowerCase() === lotNo.toLowerCase()
    );

    if (duplicate) {
      throw new DemoError(
        `Lot ${lotNo} is currently in use. Complete it before reusing it.`,
        409
      );
    }

    const cuttingOperation = db.operations.find(
      (operation) =>
        operation.department === department &&
        operation.name.toLowerCase() === "cutting" &&
        operation.isActive
    );

    if (!cuttingOperation) {
      throw new DemoError(
        "Cutting operation is not available. Please ask admin to add it.",
        400
      );
    }

    const meter = Number(input.meter);
    const area = Number(input.area);
    const width = Number(input.width);
    const panel = Number(input.panel);
    const quantity = validateQuantity(input.quantity);

    if (
      !Number.isFinite(meter) ||
      !Number.isFinite(area) ||
      !Number.isFinite(width) ||
      !Number.isFinite(panel) ||
      meter < 0 ||
      area < 0 ||
      width < 0 ||
      panel < 0
    ) {
      throw new DemoError("Meter, area, width and panel must be valid numbers.");
    }

    const now = new Date().toISOString();
    const lot: DemoProductionLot = {
      id: makeId("lot"),
      managerId: manager.id,
      department,
      lotNo,
      meter,
      area,
      width,
      panel,
      remarks: typeof input.remarks === "string" ? input.remarks.trim() || null : null,
      quantity,
      status: "active",
      currentStage: "Interlock",
      completedOperations: ["Cutting"],
      availableOperations: ["Interlock"],
      createdAt: now,
      completedAt: null,
    };

    productionLots(db).push(lot);
    db.entries.push({
      id: makeId("entry"),
      employeeId: employee.id,
      employeeName: employee.name,
      managerId: manager.id,
      managerName: manager.name,
      operationId: cuttingOperation.id,
      operationName: cuttingOperation.name,
      lotNo,
      quantity,
      department,
      createdAt: now,
    });
    await persist(db);
    return toDemoProductionLot(lot);
  },

  async completeProductionStep(input) {
    const db = await getDatabase();
    const manager = requireManager(db);
    const department = manager.department as Department;
    const lot = productionLots(db).find(
      (candidate) => candidate.id === input.lotId
    );

    if (!lot || lot.department !== department || lot.status !== "active") {
      throw new DemoError("Production lot not found.", 404);
    }

    const employee = db.employees.find(
      (candidate) => candidate.id === input.employeeId
    );
    if (
      !employee ||
      !employee.isActive ||
      employee.department !== department
    ) {
      throw new DemoError(
        "That employee is not available in your section.",
        400
      );
    }

    const operation = db.operations.find(
      (candidate) => candidate.id === input.operationId
    );
    if (!operation || !operation.isActive || operation.department !== department) {
      throw new DemoError(
        "That operation is not available in your section.",
        400
      );
    }

    const state = guidedWorkflowState(lot.completedOperations);
    if (
      !state.availableOperations.some(
        (candidate) => candidate.toLowerCase() === operation.name.toLowerCase()
      )
    ) {
      throw new DemoError(
        `Complete ${state.availableOperations.join(" or ")} first.`,
        400
      );
    }

    const completedOperations = [...lot.completedOperations, operation.name];
    const finalState = guidedWorkflowState(completedOperations);
    const now = new Date().toISOString();

    lot.completedOperations = completedOperations;
    lot.currentStage = finalState.currentStage;
    lot.availableOperations = finalState.availableOperations;

    if (finalState.isComplete) {
      lot.status = "completed";
      lot.completedAt = now;
    }

    db.entries.push({
      id: makeId("entry"),
      employeeId: employee.id,
      employeeName: employee.name,
      managerId: manager.id,
      managerName: manager.name,
      operationId: operation.id,
      operationName: operation.name,
      lotNo: lot.lotNo,
      quantity: lot.quantity,
      department,
      createdAt: now,
    });
    await persist(db);
    return toDemoProductionLot(lot);
  },

  async managerEntries(limit = 100) {
    const db = await getDatabase();
    const manager = requireManager(db);
    return latestFirst(
      db.entries.filter((entry) => entry.managerId === manager.id)
    ).slice(0, limit);
  },

  async createWorkEntry(input) {
    const db = await getDatabase();
    const manager = requireManager(db);
    const employee = db.employees.find(
      (candidate) => candidate.id === input.employeeId
    );
    const operation = db.operations.find(
      (candidate) => candidate.id === input.operationId
    );

    if (
      !employee ||
      !employee.isActive ||
      employee.department !== manager.department
    ) {
      throw new DemoError(
        "That employee is not available in your section."
      );
    }
    if (
      !operation ||
      !operation.isActive ||
      operation.department !== manager.department
    ) {
      throw new DemoError(
        "That operation is not available in your section."
      );
    }

    const entry: WorkEntry = {
      id: makeId("entry"),
      employeeId: employee.id,
      employeeName: employee.name,
      managerId: manager.id,
      managerName: manager.name,
      operationId: operation.id,
      operationName: operation.name,
      lotNo: validateLotNo(input.lotNo),
      quantity: validateQuantity(input.quantity),
      department: manager.department as Department,
      createdAt: new Date().toISOString(),
    };

    db.entries.push(entry);
    await persist(db);
    return entry;
  },

  async adminDashboard() {
    const db = await getDatabase();
    requireAdmin(db);
    const today = db.entries.filter((entry) => isToday(entry.createdAt));
    return {
      stats: {
        activeManagers: db.users.filter(
          (user) => user.role === "manager" && user.isActive
        ).length,
        activeEmployees: db.employees.filter((employee) => employee.isActive)
          .length,
        activeOperations: db.operations.filter(
          (operation) => operation.isActive
        ).length,
        todayEntries: today.length,
        todayPieces: today.reduce((sum, entry) => sum + entry.quantity, 0),
      },
      recentEntries: latestFirst(db.entries).slice(0, 8),
    };
  },

  async admins() {
    throw new DemoError(
      "Admin accounts can be managed only in live mode.",
      403
    );
  },

  async createAdmin() {
    throw new DemoError(
      "Admin accounts can be managed only in live mode.",
      403
    );
  },

  async deleteAdmin() {
    throw new DemoError(
      "Admin accounts can be managed only in live mode.",
      403
    );
  },

  async managers() {
    const db = await getDatabase();
    requireAdmin(db);
    return db.users
      .filter((user) => user.role === "manager")
      .map(managerFromUser)
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  },

  async createManager(input) {
    const db = await getDatabase();
    requireAdmin(db);
    const username = validateUsername(input.username);
    if (db.users.some((user) => user.username === username)) {
      throw new DemoError("That login ID is already in use.", 409);
    }

    const user: DemoUser = {
      id: makeId("mgr"),
      name: validateName(input.name, "Manager name"),
      username,
      password: validatePassword(input.password),
      role: "manager",
      department: validateDepartment(input.department),
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    };

    db.users.push(user);
    await persist(db);
    return managerFromUser(user);
  },

  async deleteManager(id) {
    const db = await getDatabase();
    requireAdmin(db);
    const user = db.users.find(
      (candidate) => candidate.id === id && candidate.role === "manager"
    );
    if (!user) throw new DemoError("Manager not found.", 404);

    if (db.entries.some((entry) => entry.managerId === id)) {
      throw new DemoError(
        `${user.name} has submitted production entries. Disable the account instead.`,
        409
      );
    }

    db.users = db.users.filter((candidate) => candidate.id !== user.id);
    await persist(db);
  },

  async updateManager(id, input) {
    const db = await getDatabase();
    requireAdmin(db);
    const user = db.users.find(
      (candidate) => candidate.id === id && candidate.role === "manager"
    );
    if (!user) throw new DemoError("Manager not found.", 404);

    if (input.name !== undefined) {
      user.name = validateName(input.name, "Manager name");
    }
    if (input.department !== undefined) {
      user.department = validateDepartment(input.department);
    }
    if (input.password !== undefined) {
      user.password = validatePassword(input.password);
    }
    if (input.isActive !== undefined) {
      user.isActive = Boolean(input.isActive);
    }

    await persist(db);
    return managerFromUser(user);
  },

  async employees() {
    const db = await getDatabase();
    requireAdmin(db);
    return [...db.employees].sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      if (a.department !== b.department) {
        return a.department.localeCompare(b.department);
      }
      return a.name.localeCompare(b.name);
    });
  },

  async createEmployee(input) {
    const db = await getDatabase();
    requireAdmin(db);
    const employee: Employee = {
      id: makeId("emp"),
      name: validateName(input.name, "Employee name"),
      department: validateDepartment(input.department),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    db.employees.push(employee);
    await persist(db);
    return employee;
  },

  async updateEmployee(id, input) {
    const db = await getDatabase();
    requireAdmin(db);
    const employee = db.employees.find((candidate) => candidate.id === id);
    if (!employee) throw new DemoError("Employee not found.", 404);

    if (input.name !== undefined) {
      employee.name = validateName(input.name, "Employee name");
    }
    if (input.department !== undefined) {
      employee.department = validateDepartment(input.department);
    }
    if (input.isActive !== undefined) {
      employee.isActive = Boolean(input.isActive);
    }

    await persist(db);
    return employee;
  },

  async deleteEmployee(id) {
    const db = await getDatabase();
    requireAdmin(db);
    const employee = db.employees.find((candidate) => candidate.id === id);
    if (!employee) throw new DemoError("Employee not found.", 404);

    if (db.entries.some((entry) => entry.employeeId === id)) {
      throw new DemoError(
        `${employee.name} has submitted production entries. Disable the employee instead.`,
        409
      );
    }

    db.employees = db.employees.filter((candidate) => candidate.id !== employee.id);
    await persist(db);
  },

  async operations() {
    const db = await getDatabase();
    requireAdmin(db);
    return [...db.operations].sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      if (a.department !== b.department) {
        return a.department.localeCompare(b.department);
      }
      return a.name.localeCompare(b.name);
    });
  },

  async createOperation(input) {
    const db = await getDatabase();
    requireAdmin(db);
    const name = validateName(input.name, "Operation name", 60);
    const department = validateDepartment(input.department);
    if (
      db.operations.some(
        (operation) =>
          operation.department === department &&
          operation.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      throw new DemoError(
        "That operation already exists for this department.",
        409
      );
    }

    const operation: Operation = {
      id: makeId("op"),
      name,
      department,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    db.operations.push(operation);
    await persist(db);
    return operation;
  },

  async updateOperation(id, input) {
    const db = await getDatabase();
    requireAdmin(db);
    const operation = db.operations.find((candidate) => candidate.id === id);
    if (!operation) throw new DemoError("Operation not found.", 404);

    if (input.name !== undefined) {
      operation.name = validateName(input.name, "Operation name", 60);
    }
    if (input.department !== undefined) {
      operation.department = validateDepartment(input.department);
    }
    if (input.isActive !== undefined) {
      operation.isActive = Boolean(input.isActive);
    }

    const duplicate = db.operations.some(
      (candidate) =>
        candidate.id !== operation.id &&
        candidate.department === operation.department &&
        candidate.name.toLowerCase() === operation.name.toLowerCase()
    );
    if (duplicate) {
      throw new DemoError(
        "That operation already exists for this department.",
        409
      );
    }

    await persist(db);
    return operation;
  },

  async adminReportEntries(input) {
    const db = await getDatabase();
    requireAdmin(db);

    return db.entries
      .filter((entry) => {
        const key = dateKeyInTimeZone(new Date(entry.createdAt));

        if (key !== input.date) return false;
        if (input.department && entry.department !== input.department) {
          return false;
        }

        return true;
      })
      .sort(
        (left, right) =>
          new Date(left.createdAt).getTime() -
          new Date(right.createdAt).getTime()
      );
  },

  async entries(department, limit = 100) {
    const db = await getDatabase();
    requireAdmin(db);
    return latestFirst(
      department
        ? db.entries.filter((entry) => entry.department === department)
        : db.entries
    ).slice(0, limit);
  },
};
