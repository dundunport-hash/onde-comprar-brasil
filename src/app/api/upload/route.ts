import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { UploadApiResponse } from "cloudinary";
import cloudinary from "@/lib/cloudinary";
import { authOptions } from "@/lib/auth";
import {
  consumeRateLimit,
  createRateLimitKey,
  getClientIp,
  rateLimitExceededResponse,
} from "@/lib/rate-limit";
import { sanitizeCloudinaryFolder } from "@/lib/sanitize";

const MAX_IMAGE_UPLOAD_SIZE_BYTES = 3 * 1024 * 1024;
const MAX_VIDEO_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;
const PUBLIC_UPLOAD_LIMIT = 20;
const ADMIN_UPLOAD_LIMIT = 120;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);
const PRESCRIPTION_PDF_TYPE = "application/pdf";
const ALLOWED_FOLDERS = new Set([
  "drogaria-mega-popular",
  "usuarios",
  "receitas",
  "banners",
]);

function isFileLike(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "size" in value &&
    "type" in value
  );
}

function isAllowedUploadType(fileType: string, folder: string) {
  return (
    ALLOWED_IMAGE_TYPES.has(fileType) ||
    (folder === "drogaria-mega-popular" && ALLOWED_VIDEO_TYPES.has(fileType)) ||
    (folder === "receitas" && fileType === PRESCRIPTION_PDF_TYPE)
  );
}

function getUploadTypeError(folder: string) {
  if (folder === "receitas") {
    return "Envie uma imagem JPG, PNG, WebP, GIF ou um arquivo PDF.";
  }

  if (folder === "drogaria-mega-popular") {
    return "Envie uma imagem JPG, PNG, WebP, GIF ou um video MP4, WebM ou MOV.";
  }

  return "Envie uma imagem JPG, PNG, WebP ou GIF.";
}

function getUploadSizeLimit(fileType: string) {
  return ALLOWED_VIDEO_TYPES.has(fileType)
    ? MAX_VIDEO_UPLOAD_SIZE_BYTES
    : MAX_IMAGE_UPLOAD_SIZE_BYTES;
}

function getUploadSizeError(fileType: string) {
  return ALLOWED_VIDEO_TYPES.has(fileType)
    ? "O video deve ter ate 50 MB."
    : "O arquivo deve ter ate 3 MB.";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const requestedFolder = sanitizeCloudinaryFolder(formData.get("folder"));

    if (!ALLOWED_FOLDERS.has(requestedFolder)) {
      return NextResponse.json(
        { error: "Pasta de upload invalida." },
        { status: 400 },
      );
    }

    const folder = requestedFolder;
    const isPublicProfileUpload = folder === "usuarios";
    const isPublicPrescriptionUpload = folder === "receitas";
    const session = isPublicProfileUpload
      ? null
      : isPublicPrescriptionUpload
        ? null
        : await getServerSession(authOptions);

    if (
      !isPublicProfileUpload &&
      !isPublicPrescriptionUpload &&
      session?.user?.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Apenas administradores podem enviar imagens de produtos." },
        { status: 403 },
      );
    }

    const uploadLimit = consumeRateLimit({
      key: createRateLimitKey(
        isPublicProfileUpload
          ? "upload:profile:ip"
          : isPublicPrescriptionUpload
            ? "upload:prescription:ip"
            : "upload:product:admin",
        isPublicProfileUpload || isPublicPrescriptionUpload
          ? getClientIp(request)
          : (session?.user?.id ?? getClientIp(request)),
      ),
      limit:
        isPublicProfileUpload || isPublicPrescriptionUpload
          ? PUBLIC_UPLOAD_LIMIT
          : ADMIN_UPLOAD_LIMIT,
      windowMs: 60 * 60 * 1000,
    });

    if (!uploadLimit.allowed) {
      return rateLimitExceededResponse(uploadLimit);
    }

    if (!isFileLike(file)) {
      return NextResponse.json(
        { error: "Nenhum arquivo foi fornecido." },
        { status: 400 },
      );
    }

    if (!isAllowedUploadType(file.type, folder)) {
      return NextResponse.json(
        { error: getUploadTypeError(folder) },
        { status: 400 },
      );
    }

    const uploadSizeLimit = getUploadSizeLimit(file.type);

    if (file.size === 0 || file.size > uploadSizeLimit) {
      return NextResponse.json(
        { error: getUploadSizeError(file.type) },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const isPdf = file.type === PRESCRIPTION_PDF_TYPE;
    const isVideo = ALLOWED_VIDEO_TYPES.has(file.type);

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: isPdf ? "raw" : isVideo ? "video" : "image",
          allowed_formats: isPdf
            ? ["pdf"]
            : isVideo
              ? ["mp4", "webm", "mov"]
              : ["jpg", "jpeg", "png", "webp", "gif"],
          overwrite: false,
        },
        (error, result) => {
          if (error || !result) reject(error);
          else resolve(result);
        },
      );

      uploadStream.end(buffer);
    });

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    });
  } catch (error) {
    console.error("Erro ao fazer upload:", error);
    return NextResponse.json(
      { error: "Erro ao fazer upload do arquivo." },
      { status: 500 },
    );
  }
}
