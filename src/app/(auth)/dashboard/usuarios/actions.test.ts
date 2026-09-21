import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { updateUserRole } from "./actions";

const mockedRequireAdminSession = requireAdminSession as unknown as Mock;
const mockedRevalidatePath = vi.mocked(revalidatePath);
const mockedCount = prisma.user.count as unknown as Mock;
const mockedFindUnique = prisma.user.findUnique as unknown as Mock;
const mockedUpdate = prisma.user.update as unknown as Mock;

function buildUserRoleForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const values = {
    userId: "user-1",
    role: "ADMIN",
    ...overrides,
  };

  Object.entries(values).forEach(([key, value]) => {
    formData.set(key, value);
  });

  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedRequireAdminSession.mockResolvedValue({
    user: {
      id: "admin-1",
      role: "ADMIN",
    },
  });
  mockedFindUnique.mockResolvedValue({
    id: "user-1",
    role: "USER",
  });
  mockedCount.mockResolvedValue(2);
});

describe("user admin actions", () => {
  it("updates a user role and refreshes admin views", async () => {
    await updateUserRole(buildUserRoleForm({ role: "ADMIN" }));

    expect(mockedUpdate).toHaveBeenCalledWith({
      where: {
        id: "user-1",
      },
      data: {
        role: "ADMIN",
      },
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/usuarios");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("blocks demoting the last administrator", async () => {
    mockedFindUnique.mockResolvedValue({
      id: "admin-1",
      role: "ADMIN",
    });
    mockedCount.mockResolvedValue(1);

    await expect(
      updateUserRole(
        buildUserRoleForm({
          userId: "admin-1",
          role: "USER",
        }),
      ),
    ).rejects.toThrow("Mantenha pelo menos um administrador ativo.");

    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("refreshes the app layout when the current admin demotes themselves", async () => {
    mockedRequireAdminSession.mockResolvedValue({
      user: {
        id: "admin-1",
        role: "ADMIN",
      },
    });
    mockedFindUnique.mockResolvedValue({
      id: "admin-1",
      role: "ADMIN",
    });
    mockedCount.mockResolvedValue(2);

    await updateUserRole(
      buildUserRoleForm({
        userId: "admin-1",
        role: "USER",
      }),
    );

    expect(mockedRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("rejects unknown roles", async () => {
    await expect(
      updateUserRole(buildUserRoleForm({ role: "MANAGER" })),
    ).rejects.toThrow("Papel de usuario invalido.");

    expect(mockedFindUnique).not.toHaveBeenCalled();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });
});
