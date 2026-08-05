import bpy
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="public/models/avatars/ch36-mixamo.min.glb")

meshes = [o for o in bpy.data.objects if o.type == 'MESH' and o.name != 'Icosphere']
print(f"\n=== CH36-MIXAMO.MIN.GLB (EXCLUDING ICOSPHERE) BBOX ===")
print(f"Body Meshes: {[m.name for m in meshes]}")

min_z = float('inf')
max_z = float('-inf')

for m in meshes:
    for corner in m.bound_box:
        w_corner = m.matrix_world @ Vector(corner)
        min_z = min(min_z, w_corner.z)
        max_z = max(max_z, w_corner.z)

print(f"Min Z: {min_z:.4f}, Max Z: {max_z:.4f}, Height: {max_z - min_z:.4f}")
