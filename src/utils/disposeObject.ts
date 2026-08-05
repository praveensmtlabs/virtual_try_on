import type * as THREE from "three";

/** Dispose geometry, material(s), and textures for a Three.js object tree. */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const material = mesh.material;
    if (!material) return;

    const materials = Array.isArray(material) ? material : [material];
    for (const mat of materials) {
      for (const key of Object.keys(mat) as Array<keyof typeof mat>) {
        const value = mat[key];
        if (value && typeof value === "object" && "minFilter" in (value as object)) {
          (value as THREE.Texture).dispose();
        }
      }
      mat.dispose();
    }
  });
}
