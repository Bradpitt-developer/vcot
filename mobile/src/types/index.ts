export type Department = "PETTICOAT" | "RMG";
export type UserRole = "admin" | "manager";

export type SessionUser = {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  department: Department | null;
  isActive?: boolean;
  createdAt?: string;
};

export type AdminAccount = {
  id: string;
  name: string;
  username: string;
  role: "admin";
  department: null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
};

export type CreateAdminInput = {
  name: string;
  username: string;
  password: string;
};

export type Manager = {
  id: string;
  name: string;
  username: string;
  role: "manager";
  department: Department;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
};

export type Employee = {
  id: string;
  name: string;
  department: Department;
  isActive: boolean;
  createdAt: string;
  operations: Operation[];
};

export type Operation = {
  id: string;
  name: string;
  department: Department;
  isActive: boolean;
  createdAt: string;
};

export type WorkEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  managerId: string;
  managerName: string;
  operationId: string;
  operationName: string;
  lotNo: string;
  quantity: number;
  department: Department;
  createdAt: string;
};

export type LoginResult = {
  token: string;
  user: SessionUser;
};

export type ProductionLot = {
  id: string;
  managerId: string;
  department: Department;
  lotNo: string;
  meter: number;
  area: number;
  width: number;
  panel: number;
  remarks: string | null;
  quantity: number;
  status: "active" | "completed";
  currentStage: string;
  completedOperations: string[];
  availableOperations: string[];
  createdAt: string;
  completedAt: string | null;
};

export type CreateProductionLotInput = {
  employeeId: string;
  lotNo: string;
  meter: number;
  area: number;
  width: number;
  panel: number;
  remarks?: string;
  quantity: number;
};

export type ManagerHomeData = {
  employees: Employee[];
  operations: Operation[];
  entries: WorkEntry[];
  stats: {
    todayEntries: number;
    todayPieces: number;
  };
};

export type AdminDashboardData = {
  stats: {
    activeManagers: number;
    activeEmployees: number;
    activeOperations: number;
    todayEntries: number;
    todayPieces: number;
  };
  recentEntries: WorkEntry[];
};

export type CreateManagerInput = {
  name: string;
  username: string;
  password: string;
  department: Department;
};

export type UpdateManagerInput = {
  name?: string;
  department?: Department;
  password?: string;
  isActive?: boolean;
};

export type CreateEmployeeInput = {
  name: string;
  department: Department;
  operationIds?: string[];
};

export type UpdateEmployeeInput = {
  name?: string;
  department?: Department;
  isActive?: boolean;
  operationIds?: string[];
};

export type CreateOperationInput = {
  name: string;
  department: Department;
};

export type UpdateOperationInput = {
  name?: string;
  department?: Department;
  isActive?: boolean;
};

export type CreateWorkEntryInput = {
  employeeId: string;
  operationId: string;
  lotNo: string;
  quantity: number;
};

export type DataSource = {
  loginAdmin(username: string, password: string): Promise<LoginResult>;
  loginManager(
    department: Department,
    username: string,
    password: string
  ): Promise<LoginResult>;
  me(): Promise<SessionUser>;

  managerHome(): Promise<ManagerHomeData>;
  managerLot(lotNo: string): Promise<ProductionLot | null>;
  createProductionLot(
    input: CreateProductionLotInput,
  ): Promise<ProductionLot>;
  completeProductionStep(input: {
    lotId: string;
    employeeId: string;
    operationId: string;
  }): Promise<ProductionLot>;
  managerEntries(limit?: number): Promise<WorkEntry[]>;
  createWorkEntry(input: CreateWorkEntryInput): Promise<WorkEntry>;

  adminDashboard(): Promise<AdminDashboardData>;
  admins(masterPassword: string): Promise<AdminAccount[]>;
  createAdmin(
    input: CreateAdminInput,
    masterPassword: string,
  ): Promise<AdminAccount>;
  deleteAdmin(id: string, masterPassword: string): Promise<void>;
  managers(): Promise<Manager[]>;
  createManager(input: CreateManagerInput): Promise<Manager>;
  updateManager(id: string, input: UpdateManagerInput): Promise<Manager>;
  deleteManager(id: string): Promise<void>;
  employees(): Promise<Employee[]>;
  createEmployee(input: CreateEmployeeInput): Promise<Employee>;
  updateEmployee(id: string, input: UpdateEmployeeInput): Promise<Employee>;
  deleteEmployee(id: string): Promise<void>;
  operations(): Promise<Operation[]>;
  createOperation(input: CreateOperationInput): Promise<Operation>;
  updateOperation(id: string, input: UpdateOperationInput): Promise<Operation>;
  adminReportEntries(input: {
    date: string;
    department?: Department;
  }): Promise<WorkEntry[]>;
  entries(department?: Department, limit?: number): Promise<WorkEntry[]>;
};
