import bpy
from pathlib import Path

fbx_path = Path("public/models/avatars/Ch36_nonPBR.fbx").resolve()
glb_path = Path("public/models/avatars/ch36_nonpbr.glb").resolve()

print(f"\n=== CLEAN CONVERTING {fbx_path.name} TO GLB ===")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(fbx_path))

# Clean up materials - remove broken image texture nodes
for mat in bpy.data.materials:
    print(f"Cleaning material: {mat.name}")
    mat.use_nodes = True
    nt = mat.node_tree
    # Remove any broken texture nodes or image nodes
    for node in list(nt.nodes):
        if node.type in ['TEX_IMAGE', 'TEX_ENVIRONMENT']:
            nt.nodes.remove(node)
    
    # Find or create Principled BSDF
    bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not bsdf:
        bsdf = nt.nodes.new(type='ShaderNodeBsdfPrincipled')
    
    # Set a clean warm skin tone diffuse color
    bsdf.inputs['Base Color'].default_value = (0.83, 0.64, 0.45, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.6
    
    output = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
    if not output:
        output = nt.nodes.new(type='ShaderNodeOutputMaterial')
    nt.links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

bpy.ops.export_scene.gltf(
    filepath=str(glb_path),
    export_format='GLB',
    export_materials='EXPORT',
    export_skins=True,
    export_all_influences=True,
    export_def_bones=True,
    export_animations=True
)

print(f"Successfully clean-exported GLB: {glb_path} (size={glb_path.stat().st_size / 1024 / 1024:.2f} MB)")
