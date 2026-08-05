import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="public/models/avatars/adult-male.glb")

print("\n=== ADULT MALE OBJECTS & POSITIONS ===")
for o in bpy.data.objects:
    print(f"Object: {o.name}, type: {o.type}, pos: {o.location}, scale: {o.scale}")
    if o.type == 'MESH':
        print(f"  Parent: {o.parent.name if o.parent else 'None'}")
