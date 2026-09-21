import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { sanitizeExternalId, sanitizeHttpUrl } from "@/lib/sanitize";

type PrescriptionDownloadParams = {
  orderId: string;
};

const contentTypeExtensions: Record<string, string> = {
  "application/octet-stream": "pdf",
  "application/pdf": "pdf",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function getNormalizedContentType(contentType: string) {
  return contentType.split(";")[0]?.trim().toLowerCase() ?? "";
}

function getFilenameFromContentDisposition(contentDisposition: string | null) {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  const filenameMatch = /filename="?([^";]+)"?/i.exec(contentDisposition);
  const filename = utf8Match?.[1] ?? filenameMatch?.[1];

  if (!filename) {
    return null;
  }

  try {
    return decodeURIComponent(filename);
  } catch {
    return filename;
  }
}

function getExtensionFromFilename(filename: string | null) {
  const extension = filename?.split(".").pop()?.toLowerCase();

  return extension && /^[a-z0-9]{2,6}$/.test(extension) ? extension : null;
}

function getPrescriptionFilename({
  orderId,
  contentType,
  contentDisposition,
  url,
}: {
  orderId: string;
  contentType: string;
  contentDisposition: string | null;
  url: string;
}) {
  const upstreamFilename =
    getFilenameFromContentDisposition(contentDisposition);
  const extensionFromDisposition = getExtensionFromFilename(upstreamFilename);

  if (extensionFromDisposition) {
    return `receita-${orderId.slice(0, 8)}.${extensionFromDisposition}`;
  }

  const normalizedContentType = getNormalizedContentType(contentType);
  const extensionFromType = contentTypeExtensions[normalizedContentType];

  if (extensionFromType) {
    return `receita-${orderId.slice(0, 8)}.${extensionFromType}`;
  }

  try {
    const pathname = new URL(url).pathname;
    const extension = getExtensionFromFilename(pathname);

    if (extension) {
      return `receita-${orderId.slice(0, 8)}.${extension}`;
    }
  } catch {
    return `receita-${orderId.slice(0, 8)}`;
  }

  return `receita-${orderId.slice(0, 8)}`;
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<PrescriptionDownloadParams>;
  },
) {
  const session = await getAuthSession();

  if (!session) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  if (session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { orderId: rawOrderId } = await params;
  const orderId = sanitizeExternalId(rawOrderId);

  if (!orderId) {
    return NextResponse.json({ error: "Pedido invalido." }, { status: 400 });
  }

  const order = await prisma.cart.findUnique({
    where: {
      id: orderId,
    },
    select: {
      prescriptionImageUrl: true,
    },
  });

  if (!order?.prescriptionImageUrl) {
    return NextResponse.json(
      { error: "Receita nao encontrada." },
      { status: 404 },
    );
  }

  const prescriptionUrl = sanitizeHttpUrl(order.prescriptionImageUrl);

  if (!prescriptionUrl) {
    return NextResponse.json(
      { error: "URL da receita invalida." },
      { status: 400 },
    );
  }

  const response = await fetch(prescriptionUrl, {
    cache: "no-store",
  });

  if (!response.ok || !response.body) {
    return NextResponse.json(
      { error: "Nao foi possivel baixar a receita original." },
      { status: 502 },
    );
  }

  const contentType =
    response.headers.get("content-type") ?? "application/octet-stream";
  const filename = getPrescriptionFilename({
    orderId,
    contentType,
    contentDisposition: response.headers.get("content-disposition"),
    url: prescriptionUrl,
  });

  return new Response(response.body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": contentType,
    },
  });
}
