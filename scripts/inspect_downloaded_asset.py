import sys
from pathlib import Path
import bpy

ASSET_PATH = sys.argv[sys.argv.index("--") + 1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ASSET_PATH)

print(f"\n==========================================")
print(f"ASSET INSPECTION: {Path(ASSET_PATH).name}")
print(f"==========================================")

armatures = [o for o in bpy.data.objects if o.type == "ARMATURE"]
meshes = [o for o in bpy.data.objects if o.type == "MESH"]

print(f"Armatures found: {len(armatures)}")
for a in armatures:
    print(f"  Armature: {a.name}, Bones: {len(a.data.bones)}")
    bone_names = [b.name for b in a.data.bones[:10]]
    print(f"  First 10 bones: {bone_names}")

print(f"Meshes found: {len(meshes)}")
for m in meshes:
    print(f"  Mesh: {m.name}, Vertices: {len(m.data.vertices)}, Polygons: {len(m.data.polygons)}")
    mw = m.matrix_world
    corners = [mw @ v.co for v in m.data.vertices]
    if corners:
        min_x, max_x = min(c.x for c in corners), max(c.x for c in corners)
        min_y, max_y = min(c.y for c in corners), max(c.y for c in corners)
        min_z, max_z = min(c.z for c in corners), max(c.z for c in corners)
        print(f"  Bounds X: [{min_x:.3f}, {max_x:.3f}] Size: {max_x - min_x:.3f}m")
        print(f"  Bounds Y: [{min_y:.3f}, {max_y:.3f}] Size: {max_y - min_y:.3f}m")
        print(f"  Bounds Z: [{min_z:.3f}, {max_z:.3f}] Size: {max_z - min_z:.3f}m")
    
    # Check skin weights / modifiers
    mods = [mod.type for mod in m.modifiers]
    print(f"  Modifiers: {mods}")

print("==========================================\n")
