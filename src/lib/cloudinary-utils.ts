export async function uploadToCloudinary(
  file: File,
  folder: string = "drogaria-mega-popular",
): Promise<{ url: string; publicId: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao fazer upload");
  }

  const data = await response.json();
  return {
    url: data.url,
    publicId: data.publicId,
  };
}

export function getCldImageUrl(
  publicId: string,
  options: Record<string, string | number> = {},
) {
  const baseUrl = "https://res.cloudinary.com";
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  const defaultOptions = {
    w: "500",
    q: "auto",
    f: "auto",
  };

  const mergedOptions = { ...defaultOptions, ...options };
  const params = Object.entries(mergedOptions)
    .map(([k, v]) => `${k}_${String(v)}`)
    .join(",");

  return `${baseUrl}/${cloudName}/image/upload/${params}/${publicId}`;
}
