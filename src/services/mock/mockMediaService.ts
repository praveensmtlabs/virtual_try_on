import { getMediaUrl } from "@/utils/media";
import type { MediaService } from "@/services/interfaces/mediaService";

export const mockMediaService: MediaService = {
  resolveUrl(path: string) {
    return getMediaUrl(path);
  },
};
