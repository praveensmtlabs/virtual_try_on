import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="public/models/avatars/ch36-mixamo.glb")
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
body = next(o for o in bpy.data.objects if o.type == "MESH" and o.name == "Ch36")

mw = body.matrix_world
zs = [(mw @ v.co).z for v in body.data.vertices]

print(f"\nCH36 WORLD Z MIN: {min(zs):.3f}m, MAX: {max(zs):.3f}m\n")
