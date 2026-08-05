import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="public/models/avatars/ch36-mixamo.min.glb")

nodes = [o.name for o in bpy.data.objects]
print(f"\n=== CH36-MIXAMO.MIN.GLB NODES & BONES ===")
print(f"Total Objects: {len(nodes)}")
print(f"Objects: {nodes}")

armatures = [o for o in bpy.data.objects if o.type == 'ARMATURE']
if armatures:
    arm = armatures[0]
    bones = [b.name for b in arm.data.bones]
    print(f"\nArmature '{arm.name}' Bone Count: {len(bones)}")
    print(f"Sample Bones: {bones[:30]}")
