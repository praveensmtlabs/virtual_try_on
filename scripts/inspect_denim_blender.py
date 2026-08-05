import sys
import bpy

GLB = "public/models/clothes/_downloads/bk-denim-shirt.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)

for o in bpy.data.objects:
    print(f"Object: {o.name}, Type: {o.type}")
    if o.type == "MESH":
        print(f"  Verts: {len(o.data.vertices)}, Polygons: {len(o.data.polygons)}")
        print(f"  Materials: {[m.name for m in o.data.materials]}")
        bb = o.bound_box
        print(f"  Bounds X: {[min(c[0] for c in bb), max(c[0] for c in bb)]}")
        print(f"  Bounds Y: {[min(c[1] for c in bb), max(c[1] for c in bb)]}")
        print(f"  Bounds Z: {[min(c[2] for c in bb), max(c[2] for c in bb)]}")
