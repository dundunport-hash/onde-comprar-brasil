"use client";

import { useCallback, useState } from "react";
import { uploadToCloudinary } from "@/lib/cloudinary-utils";

interface UseCloudinaryUploadReturn {
  isLoading: boolean;
  error: string | null;
  uploadedUrl: string | null;
  publicId: string | null;
  upload: (
    file: File,
    folder?: string,
  ) => Promise<{ url: string; publicId: string } | null>;
  reset: () => void;
}

export function useCloudinaryUpload(): UseCloudinaryUploadReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [publicId, setPublicId] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File, folder: string = "drogaria-mega-popular") => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await uploadToCloudinary(file, folder);
        setUploadedUrl(result.url);
        setPublicId(result.publicId);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao fazer upload");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setError(null);
    setUploadedUrl(null);
    setPublicId(null);
  }, []);

  return {
    isLoading,
    error,
    uploadedUrl,
    publicId,
    upload,
    reset,
  };
}
