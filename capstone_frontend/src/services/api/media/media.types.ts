export type MediaAsset = {
  id: string;
  secureUrl: string;
  publicId?: string;
  mimeType?: string;
  bytes?: number;
  width?: number;
  height?: number;
};

export type MediaAssetDTO = {
  Id: string;
  SecureUrl: string;
  PublicId?: string | null;
  MimeType?: string | null;
  Bytes?: number | null;
  Width?: number | null;
  Height?: number | null;
};
