import bpy

def check_glb(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    print(f"\nImporting {path}...")
    try:
        bpy.ops.import_scene.gltf(filepath=path)
        print("IMPORTED SUCCESSFULLY!")
        for o in bpy.data.objects:
            if o.type == 'MESH':
                print(f"  Mesh: {o.name}, Verts: {len(o.data.vertices)}")
    except Exception as e:
        print("FAILED TO IMPORT:", e)

check_glb("public/models/avatars/ch36-mixamo.min.glb")
check_glb("public/models/avatars/user-adult-male-tripo.min.glb")
