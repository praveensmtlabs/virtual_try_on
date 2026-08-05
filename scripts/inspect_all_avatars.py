import bpy

def inspect_file(filepath):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    try:
        bpy.ops.import_scene.gltf(filepath=filepath)
    except Exception as e:
        print(f"FAILED TO IMPORT {filepath}: {e}")
        return

    print(f"\n==========================================")
    print(f"FILE: {filepath}")
    print("==========================================")
    
    objects = list(bpy.data.objects)
    print(f"Total Objects: {len(objects)}")
    for obj in objects:
        if obj.type == 'MESH':
            verts = len(obj.data.vertices)
            polys = len(obj.data.polygons)
            mats = [m.name for m in obj.data.materials if m]
            print(f"  [MESH] {obj.name}: {verts} verts, {polys} polys, mats={mats}")
        elif obj.type == 'ARMATURE':
            bones = len(obj.data.bones)
            print(f"  [ARMATURE] {obj.name}: {bones} bones")

inspect_file("public/models/avatars/adult-male.glb")
inspect_file("public/models/avatars/base_male.glb")
inspect_file("public/models/avatars/mixamo-aj.glb")
inspect_file("public/models/avatars/ch36-mixamo.glb")
