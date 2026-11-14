import { API_URL } from "../constants/config";
import type {
  AdminAccount,
  AdminDashboardData,
  CreateAdminInput,
  CreateEmployeeInput,
  CreateManagerInput,
  CreateOperationInput,
  CreateWorkEntryInput,
  DataSource,
  Department,
  Employee,
  LoginResult,
  Manager,
  ManagerHomeData,
  Operation,
  ProductionLot,
  CreateProductionLotInput,
  SessionUser,
  WorkEntry,
} from "../types";
import { getSessionToken } from "./session";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_URL) {
    throw new Error(
      "The API address is not configured. Set EXPO_PUBLIC_API_URL before building the app."
    );
  }

  const token = getSessionToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      const message =
        payload &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof (payload as { error?: unknown }).error === "string"
          ? (payload as { error: string }).error
          : "Request failed. Please try again.";
      throw new Error(message);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The server took too long to reply. Check your connection.");
    }
    if (error instanceof TypeError) {
      throw new Error(
        "Cannot reach the server. Check your internet and the API address."
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const liveDataSource: DataSource = {
  async loginAdmin(username, password): Promise<LoginResult> {
    return request<LoginResult>("/auth/admin/login", {
      method: "POST",
      body: { username, password },
    });
  },

  async loginManager(department, username, password): Promise<LoginResult> {
    return request<LoginResult>("/auth/manager/login", {
      method: "POST",
      body: { department, username, password },
    });
  },

  async me(): Promise<SessionUser> {
    const result = await request<{ user: SessionUser }>("/auth/me");
    return result.user;
  },

  async managerHome(): Promise<ManagerHomeData> {
    return request<ManagerHomeData>("/manager/home");
  },

  async managerLot(lotNo): Promise<ProductionLot | null> {
    const result = await request<{ lot: ProductionLot | null }>(
      `/manager/lots/${encodeURIComponent(lotNo)}`
    );
    return result.lot;
  },

  async createProductionLot(input): Promise<ProductionLot> {
    const result = await request<{ lot: ProductionLot }>("/manager/lots", {
      method: "POST",
      body: input,
    });
    return result.lot;
  },

  async completeProductionStep(input): Promise<ProductionLot> {
    const result = await request<{ lot: ProductionLot }>(
      `/manager/lots/${input.lotId}/steps`,
      {
        method: "POST",
        body: {
          employeeId: input.employeeId,
          operationId: input.operationId,
        },
      },
    );
    return result.lot;
  },

  async managerEntries(limit = 100): Promise<WorkEntry[]> {
    const result = await request<{ entries: WorkEntry[] }>(
      `/manager/entries?limit=${limit}`
    );
    return result.entries;
  },

  async createWorkEntry(input: CreateWorkEntryInput): Promise<WorkEntry> {
    const result = await request<{ entry: WorkEntry }>("/manager/entries", {
      method: "POST",
      body: input,
    });
    return result.entry;
  },

  async adminDashboard(): Promise<AdminDashboardData> {
    return request<AdminDashboardData>("/admin/dashboard");
  },

  async admins(masterPassword): Promise<AdminAccount[]> {
    const result = await request<{ admins: AdminAccount[] }>("/admin/admins", {
      headers: { "x-admin-manage-password": masterPassword },
    });
    return result.admins;
  },

  async createAdmin(input, masterPassword): Promise<AdminAccount> {
    const result = await request<{ admin: AdminAccount }>("/admin/admins", {
      method: "POST",
      body: input,
      headers: { "x-admin-manage-password": masterPassword },
    });
    return result.admin;
  },

  async deleteAdmin(id, masterPassword) {
    await request<unknown>(`/admin/admins/${id}`, {
      method: "DELETE",
      headers: { "x-admin-manage-password": masterPassword },
    });
  },

  async managers(): Promise<Manager[]> {
    const result = await request<{ managers: Manager[] }>("/admin/managers");
    return result.managers;
  },

  async createManager(input: CreateManagerInput): Promise<Manager> {
    const result = await request<{ manager: Manager }>("/admin/managers", {
      method: "POST",
      body: input,
    });
    return result.manager;
  },

  async updateManager(id, input): Promise<Manager> {
    const result = await request<{ manager: Manager }>(`/admin/managers/${id}`, {
      method: "PATCH",
      body: input,
    });
    return result.manager;
  },

  async deleteManager(id) {
    await request<unknown>(`/admin/managers/${id}`, { method: "DELETE" });
  },

  async employees(): Promise<Employee[]> {
    const result = await request<{ employees: Employee[] }>("/admin/employees");
    return result.employees;
  },

  async createEmployee(input: CreateEmployeeInput): Promise<Employee> {
    const result = await request<{ employee: Employee }>("/admin/employees", {
      method: "POST",
      body: input,
    });
    return result.employee;
  },

  async updateEmployee(id, input): Promise<Employee> {
    const result = await request<{ employee: Employee }>(
      `/admin/employees/${id}`,
      { method: "PATCH", body: input }
    );
    return result.employee;
  },

  async deleteEmployee(id) {
    await request<unknown>(`/admin/employees/${id}`, { method: "DELETE" });
  },

  async operations(): Promise<Operation[]> {
    const result = await request<{ operations: Operation[] }>("/admin/operations");
    return result.operations;
  },

  async createOperation(input: CreateOperationInput): Promise<Operation> {
    const result = await request<{ operation: Operation }>("/admin/operations", {
      method: "POST",
      body: input,
    });
    return result.operation;
  },

  async updateOperation(id, input): Promise<Operation> {
    const result = await request<{ operation: Operation }>(
      `/admin/operations/${id}`,
      { method: "PATCH", body: input }
    );
    return result.operation;
  },

  async adminReportEntries(input) {
    const query = new URLSearchParams({
      date: input.date,
    });

    if (input.department) {
      query.set("department", input.department);
    }

    const result = await request<{ entries: WorkEntry[] }>(
      `/admin/entries/report?${query.toString()}`
    );
    return result.entries;
  },

  async entries(department?: Department, limit = 100): Promise<WorkEntry[]> {
    const query = new URLSearchParams();
    query.set("limit", String(limit));
    if (department) query.set("department", department);
    const result = await request<{ entries: WorkEntry[] }>(
      `/admin/entries?${query.toString()}`
    );
    return result.entries;
  },
};
