import bpy
from pathlib import Path

output_path = Path("public/models/avatars/simple-male.glb").resolve()

print("=== Creating simple male avatar GLB ===")
bpy.ops.wm.read_factory_settings(use_empty=True)

# Import the adult-male.glb (already converted)
import_path = Path("public/models/avatars/adult-male.glb").resolve()
bpy.ops.import_scene.gltf(filepath=str(import_path))

objects = list(bpy.data.objects)
print(f"Imported {len(objects)} objects:")
for o in objects:
    print(f" - {o.name} (type={o.type})")

# Fix all materials to have a clean skin tone
for mat in bpy.data.materials:
    mat.use_nodes = True
    nt = mat.node_tree
    # Remove broken nodes
    for node in list(nt.nodes):
        if node.type in ['TEX_IMAGE', 'TEX_ENVIRONMENT']:
            nt.nodes.remove(node)
    
    bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not bsdf:
        bsdf = nt.nodes.new(type='ShaderNodeBsdfPrincipled')
    
    # Skin-tone color
    bsdf.inputs['Base Color'].default_value = (0.83, 0.64, 0.45, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.7
    bsdf.inputs['Subsurface Weight'].default_value = 0.1
    
    output = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
    if not output:
        output = nt.nodes.new(type='ShaderNodeOutputMaterial')
    
    nt.links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
    print(f"Fixed material: {mat.name}")

bpy.ops.export_scene.gltf(
    filepath=str(output_path),
    export_format='GLB',
    export_materials='EXPORT',
    export_skins=True,
    export_all_influences=True,
    export_def_bones=True,
    export_animations=True,
)

size = output_path.stat().st_size / 1024 / 1024
print(f"\nExported: {output_path}")
print(f"Size: {size:.2f} MB")
