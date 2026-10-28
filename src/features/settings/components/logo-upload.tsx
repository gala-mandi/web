"use client";

import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ShopLogo } from "@/features/panel/components/shop-logo";
import { toApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useUpdateSettings, useUploadLogo } from "../hooks";
import { settingsText } from "../text";

const t = settingsText.logo;
const MAX_BYTES = 1024 * 1024;

function rejectionMessage([rejection]: FileRejection[]): string {
  const code = rejection?.errors[0]?.code;
  if (code === "file-too-large") return t.tooLarge;
  if (code === "too-many-files") return t.oneFile;
  return t.wrongType;
}

/**
 * Drop zone for the shop logo. Uploads at once (separate from "Save changes");
 * the browser checks type and size first, the server checks them again.
 */
export function LogoUpload({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const upload = useUploadLogo();
  const remove = useUpdateSettings();
  const busy = upload.isPending || remove.isPending;

  const fail = (e: unknown) => {
    const apiError = toApiError(e);
    setError(
      apiError.status === 0
        ? settingsText.errors.network
        : (apiError.message ?? settingsText.errors.generic),
    );
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"] },
    maxSize: MAX_BYTES,
    multiple: false,
    disabled: busy,
    // One callback: with several files react-dropzone accepts the first and
    // rejects the rest, and nothing should be uploaded then.
    onDrop: async ([file], rejections) => {
      if (rejections.length > 0) {
        setError(rejectionMessage(rejections));
        return;
      }
      if (!file) return;
      setError(null);
      try {
        await upload.mutateAsync(file);
        toast.success(t.uploaded);
      } catch (e) {
        fail(e);
      }
    },
  });

  const onRemove = async () => {
    setError(null);
    try {
      await remove.mutateAsync({ logoUrl: null });
      toast.success(t.removed);
    } catch (e) {
      fail(e);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span id="logo-label" className="text-sm font-semibold">
        {t.label}
      </span>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <ShopLogo name={name} logoUrl={logoUrl} className="size-20 text-xl" />
        <div
          {...getRootProps({
            "aria-labelledby": "logo-label",
            "aria-describedby": error ? "logo-rules logo-error" : "logo-rules",
            className: cn(
              "rounded-field bg-card focus-visible:ring-ring/50 flex flex-1 cursor-pointer flex-col items-center gap-1 border border-dashed px-4 py-5 text-center outline-none focus-visible:ring-[3px]",
              isDragActive && "border-primary bg-primary/5",
              error && "border-destructive",
              busy && "cursor-wait opacity-70",
            ),
          })}
          data-testid="logo-dropzone"
        >
          <input {...getInputProps()} data-testid="logo-input" />
          {upload.isPending ? (
            <Loader2 aria-hidden className="text-primary size-5 animate-spin" />
          ) : (
            <ImageUp aria-hidden className="text-primary size-5" />
          )}
          <span className="text-sm font-semibold">
            {upload.isPending
              ? t.uploading
              : isDragActive
                ? t.dropActive
                : t.drop}
          </span>
          <span id="logo-rules" className="text-muted-foreground text-xs">
            {t.rules}
          </span>
        </div>
        {logoUrl ? (
          <Button
            type="button"
            variant="outline"
            onClick={onRemove}
            disabled={busy}
            className="gap-2"
          >
            {remove.isPending ? (
              <Loader2 aria-hidden className="animate-spin" />
            ) : (
              <Trash2 aria-hidden />
            )}
            {t.remove}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p
          id="logo-error"
          role="alert"
          className="text-destructive text-sm font-medium"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
