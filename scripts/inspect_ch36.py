import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="public/models/avatars/ch36-mixamo.min.glb")

print("\n=== CH36 MESH OBJECTS ===")
for o in bpy.data.objects:
    if o.type == "MESH":
        mats = [m.name for m in o.data.materials if m]
        print(f"Mesh: {o.name}, Vertices: {len(o.data.vertices)}, Materials: {mats}")
print("=========================\n")
