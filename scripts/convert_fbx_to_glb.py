import bpy
from pathlib import Path

fbx_path = Path("public/models/avatars/Ch36_nonPBR.fbx").resolve()
glb_path = Path("public/models/avatars/ch36_nonpbr.glb").resolve()

print(f"\n=== CONVERTING {fbx_path.name} TO GLB ===")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(fbx_path))

objects = list(bpy.data.objects)
print(f"Imported {len(objects)} objects:")
for o in objects:
    print(f" - {o.name} (type={o.type})")

bpy.ops.export_scene.gltf(
    filepath=str(glb_path),
    export_format='GLB',
    export_materials='EXPORT',
    export_skins=True,
    export_all_influences=True,
    export_def_bones=True,
    export_animations=True
)

print(f"Successfully exported GLB: {glb_path} (size={glb_path.stat().st_size / 1024 / 1024:.2f} MB)")
