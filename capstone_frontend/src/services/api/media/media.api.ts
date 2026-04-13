import { http } from "../http";
import type { MediaAsset, MediaAssetDTO } from "./media.types";

function mapMediaAsset(dto: MediaAssetDTO): MediaAsset {
  return {
    id: dto.Id,
    secureUrl: dto.SecureUrl,
    publicId: dto.PublicId ?? undefined,
    mimeType: dto.MimeType ?? undefined,
    bytes: dto.Bytes ?? undefined,
    width: dto.Width ?? undefined,
    height: dto.Height ?? undefined,
  };
}

export const mediaApi = {
  async listUserMedia(userId: string): Promise<MediaAsset[]> {
    const data = await http.data<MediaAssetDTO[]>(`/api/media/user/${userId}`);
    return data.map(mapMediaAsset);
  },

  async uploadUserMedia(userId: string, file: File): Promise<MediaAsset> {
    const formData = new FormData();
    formData.append("image", file);

    const data = await http.data<MediaAssetDTO>(`/api/media/user/${userId}`, {
      method: "POST",
      body: formData,
    });

    return mapMediaAsset(data);
  },

  async deleteUserMedia(userId: string, mediaId: string): Promise<string> {
    return http.data<string>(`/api/media/user/${userId}/${mediaId}`, {
      method: "DELETE",
    });
  },
};
