"""Convert a Mixamo FBX to GLB via Blender."""
import sys
import bpy

fbx_path = sys.argv[sys.argv.index("--") + 1]
glb_path = sys.argv[sys.argv.index("--") + 2]

bpy.ops.wm.read_factory_settings(use_empty=True)

bpy.ops.import_scene.fbx(
    filepath=fbx_path,
    automatic_bone_orientation=True,
    use_anim=True,
)

# Ensure textures are packed for a self-contained GLB when possible.
for img in bpy.data.images:
    if img.filepath and not img.packed_file:
        try:
            img.pack()
        except Exception:
            pass

bpy.ops.export_scene.gltf(
    filepath=glb_path,
    export_format="GLB",
    export_animations=True,
    export_skins=True,
    export_morph=True,
    export_apply=False,
    export_texcoords=True,
    export_normals=True,
    export_materials="EXPORT",
    export_image_format="AUTO",
)

print(f"Exported: {glb_path}")
