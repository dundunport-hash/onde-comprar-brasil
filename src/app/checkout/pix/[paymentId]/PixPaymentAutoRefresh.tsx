"use client";

import { useEffect } from "react";

type PixPaymentAutoRefreshProps = {
  paymentId: string;
};

type PixPaymentStatusResponse = {
  approved?: boolean;
  redirectUrl?: string | null;
};

export function PixPaymentAutoRefresh({
  paymentId,
}: PixPaymentAutoRefreshProps) {
  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function checkPaymentStatus() {
      try {
        const response = await fetch(
          `/api/checkout/pix/${encodeURIComponent(paymentId)}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as PixPaymentStatusResponse;

        if (payload.approved && payload.redirectUrl) {
          isMounted = false;
          window.location.assign(payload.redirectUrl);
        }
      } finally {
        if (isMounted) {
          timeoutId = setTimeout(checkPaymentStatus, 5000);
        }
      }
    }

    timeoutId = setTimeout(checkPaymentStatus, 5000);

    return () => {
      isMounted = false;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [paymentId]);

  return null;
}
