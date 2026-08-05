import bpy
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="public/models/avatars/ch36-mixamo.min.glb")

meshes = [o for o in bpy.data.objects if o.type == 'MESH']
print(f"\n=== CH36-MIXAMO.MIN.GLB BBOX ===")
print(f"Total Meshes: {len(meshes)}")

min_y = float('inf')
max_y = float('-inf')

for m in meshes:
    for corner in m.bound_box:
        w_corner = m.matrix_world @ Vector(corner)
        min_y = min(min_y, w_corner.z) # In Blender Z is up
        max_y = max(max_y, w_corner.z)

print(f"Min Z: {min_y:.4f}, Max Z: {max_y:.4f}, Height: {max_y - min_y:.4f}")
