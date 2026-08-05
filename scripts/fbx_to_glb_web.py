"""Re-export Mixamo FBX as a web-friendly GLB with 1024 textures."""
import sys
import bpy

fbx_path = sys.argv[sys.argv.index("--") + 1]
glb_path = sys.argv[sys.argv.index("--") + 2]
max_size = 1024

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(
    filepath=fbx_path,
    automatic_bone_orientation=True,
    use_anim=True,
)

for img in bpy.data.images:
    try:
        if img.size[0] > max_size or img.size[1] > max_size:
            img.scale(max_size, max_size)
        if not img.packed_file:
            img.pack()
    except Exception as e:
        print("texture skip:", img.name, e)

# Prefer fewer texture channels if possible: keep baseColor + normal.
for mat in bpy.data.materials:
    if not mat.use_nodes:
        continue
    nodes = mat.node_tree.nodes
    # Leave material graph intact; size reduction is enough for web.

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
    export_image_format="JPEG",
    export_jpeg_quality=85,
)

print(f"Exported: {glb_path}")
