import { useGLTF } from "@react-three/drei";
import { getMediaUrl } from "@/utils/media";

/**
 * Call with known GLB paths once production assets exist.
 * Safe no-op if files are missing at runtime (useGLTF will error only when used).
 */
export function preloadAvatarModels(paths: string[]) {
  for (const path of paths) {
    try {
      useGLTF.preload(getMediaUrl(path));
    } catch {
      // Placeholders in use — ignore missing files during Phase 1
    }
  }
}
