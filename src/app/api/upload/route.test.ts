import { PassThrough } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  UploadApiOptions,
  UploadApiResponse,
  UploadResponseCallback,
  UploadStream,
} from "cloudinary";

vi.mock("@/lib/cloudinary", () => ({
  default: {
    uploader: {
      upload_stream: vi.fn(),
    },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { getServerSession } from "next-auth";
import cloudinary from "@/lib/cloudinary";
import { clearRateLimitStore } from "@/lib/rate-limit";
import { POST } from "./route";

const mockedUploadStream = vi.mocked(cloudinary.uploader.upload_stream);
const mockedGetServerSession = vi.mocked(getServerSession);
const mockedUploadStreamWithOptions = mockedUploadStream as unknown as {
  mockImplementation: (
    implementation: (
      options: UploadApiOptions,
      callback?: UploadResponseCallback,
    ) => UploadStream,
  ) => void;
};

beforeEach(() => {
  vi.clearAllMocks();
  clearRateLimitStore();
  mockedGetServerSession.mockResolvedValue({
    user: {
      id: "admin-1",
      role: "ADMIN",
    },
    expires: new Date(Date.now() + 60_000).toISOString(),
  });
  mockedUploadStreamWithOptions.mockImplementation((options, callback) => {
    const stream = new PassThrough();

    stream.on("finish", () => {
      callback?.(undefined, {
        secure_url: "https://res.cloudinary.com/demo/image/upload/avatar.webp",
        public_id: `${options.folder}/avatar`,
        format: "webp",
        width: 320,
        height: 320,
        bytes: 1024,
      } as UploadApiResponse);
    });

    return stream as UploadStream;
  });
});

type TestFile = {
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function buildFile(content: BodyInit, type: string): TestFile {
  return {
    type,
    size:
      content instanceof Uint8Array
        ? content.byteLength
        : Buffer.byteLength(String(content)),
    async arrayBuffer() {
      return new Response(content).arrayBuffer();
    },
  };
}

function buildUploadRequest(file: TestFile, folder = "usuarios") {
  const request = new Request("http://localhost/api/upload", {
    method: "POST",
    headers: {
      "x-forwarded-for": "127.0.0.1",
    },
  });

  return Object.assign(request, {
    formData: async () => ({
      get: (key: string) => {
        if (key === "file") return file;
        if (key === "folder") return folder;
        return null;
      },
    }),
  });
}

describe("POST /api/upload", () => {
  it("uploads only images with constrained Cloudinary options", async () => {
    const response = await POST(
      buildUploadRequest(buildFile("image-content", "image/webp")) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedUploadStream).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: "usuarios",
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
        overwrite: false,
      }),
      expect.any(Function),
    );
    expect(body).toEqual({
      url: "https://res.cloudinary.com/demo/image/upload/avatar.webp",
      publicId: "usuarios/avatar",
      format: "webp",
      width: 320,
      height: 320,
      bytes: 1024,
    });
  });

  it("allows product video uploads with constrained Cloudinary options", async () => {
    const response = await POST(
      buildUploadRequest(
        buildFile("video-content", "video/mp4"),
        "drogaria-mega-popular",
      ) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedUploadStream).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: "drogaria-mega-popular",
        resource_type: "video",
        allowed_formats: ["mp4", "webm", "mov"],
        overwrite: false,
      }),
      expect.any(Function),
    );
    expect(body.publicId).toBe("drogaria-mega-popular/avatar");
  });

  it("rejects unsupported file types before uploading", async () => {
    const response = await POST(
      buildUploadRequest(buildFile("<svg></svg>", "image/svg+xml")) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("JPG");
    expect(mockedUploadStream).not.toHaveBeenCalled();
  });

  it("rejects files larger than the upload limit", async () => {
    const response = await POST(
      buildUploadRequest(
        buildFile(new Uint8Array(3 * 1024 * 1024 + 1), "image/png"),
      ) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("3 MB");
    expect(mockedUploadStream).not.toHaveBeenCalled();
  });

  it("rejects product videos larger than the video upload limit", async () => {
    const response = await POST(
      buildUploadRequest(
        buildFile(new Uint8Array(50 * 1024 * 1024 + 1), "video/mp4"),
        "drogaria-mega-popular",
      ) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("50 MB");
    expect(mockedUploadStream).not.toHaveBeenCalled();
  });

  it("rejects unknown upload folders", async () => {
    const response = await POST(
      buildUploadRequest(
        buildFile("image-content", "image/png"),
        "../private",
      ) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Pasta");
    expect(mockedUploadStream).not.toHaveBeenCalled();
  });

  it("requires an admin session for product images", async () => {
    mockedGetServerSession.mockResolvedValueOnce(null);

    const response = await POST(
      buildUploadRequest(
        buildFile("image-content", "image/png"),
        "drogaria-mega-popular",
      ) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain("administradores");
    expect(mockedUploadStream).not.toHaveBeenCalled();
  });

  it("allows prescription uploads without an admin session", async () => {
    const response = await POST(
      buildUploadRequest(
        buildFile("image-content", "image/png"),
        "receitas",
      ) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedUploadStream).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: "receitas",
      }),
      expect.any(Function),
    );
    expect(body.publicId).toBe("receitas/avatar");
  });

  it("allows prescription PDF uploads as raw files", async () => {
    const response = await POST(
      buildUploadRequest(
        buildFile("%PDF-1.4", "application/pdf"),
        "receitas",
      ) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedUploadStream).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: "receitas",
        resource_type: "raw",
        allowed_formats: ["pdf"],
        overwrite: false,
      }),
      expect.any(Function),
    );
    expect(body.publicId).toBe("receitas/avatar");
  });

  it("rejects PDF uploads outside prescription files", async () => {
    const response = await POST(
      buildUploadRequest(buildFile("%PDF-1.4", "application/pdf")) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("JPG");
    expect(mockedUploadStream).not.toHaveBeenCalled();
  });

  it("allows a higher hourly limit for admin product uploads", async () => {
    for (let index = 0; index < 21; index += 1) {
      const response = await POST(
        buildUploadRequest(
          buildFile(`image-content-${index}`, "image/png"),
          "drogaria-mega-popular",
        ) as never,
      );

      expect(response.status).toBe(200);
    }

    expect(mockedUploadStream).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: "drogaria-mega-popular",
      }),
      expect.any(Function),
    );
  });
});
