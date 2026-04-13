"use client";

import { useCallback, useEffect, useState } from "react";
import { mediaApi } from "@/services/api/media/media.api";

export function useUserProfileMedia(userId?: string) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const loadProfileMedia = useCallback(async () => {
    if (!userId) {
      setAvatarUrl(null);
      return;
    }

    try {
      setAvatarError(null);
      const media = await mediaApi.listUserMedia(userId);
      setAvatarUrl(media[0]?.secureUrl ?? null);
    } catch (error: unknown) {
      setAvatarError(
        error instanceof Error ? error.message : "Failed to load profile picture",
      );
    }
  }, [userId]);

  useEffect(() => {
    void loadProfileMedia();
  }, [loadProfileMedia]);

  const uploadProfileMedia = useCallback(
    async (file: File) => {
      if (!userId) return null;

      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new Error("Only JPEG, PNG, and WEBP images are allowed.");
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Profile picture must be 5 MB or smaller.");
      }

      try {
        setAvatarUploading(true);
        setAvatarError(null);

        const existingMedia = await mediaApi.listUserMedia(userId);
        const uploadedMedia = await mediaApi.uploadUserMedia(userId, file);

        await Promise.all(
          existingMedia.map((media) =>
            mediaApi.deleteUserMedia(userId, media.id),
          ),
        );

        setAvatarUrl(uploadedMedia.secureUrl);
        return uploadedMedia;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to upload profile picture";
        setAvatarError(message);
        throw new Error(message);
      } finally {
        setAvatarUploading(false);
      }
    },
    [userId],
  );

  return {
    avatarUrl,
    avatarError,
    avatarUploading,
    loadProfileMedia,
    uploadProfileMedia,
  };
}
