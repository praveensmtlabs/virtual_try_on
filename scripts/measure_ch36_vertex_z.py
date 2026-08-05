import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="public/models/avatars/ch36-mixamo.min.glb")

print("\n=== MESH VERTEX Z BOUNDS ===")
for o in bpy.data.objects:
    if o.type == "MESH":
        mw = o.matrix_world
        z_coords = [(mw @ v.co).z for v in o.data.vertices]
        if z_coords:
            print(f"Mesh: {o.name}, Count: {len(z_coords)}, Z Mins: {min(z_coords):.3f}m, Z Maxs: {max(z_coords):.3f}m")
print("============================\n")
