import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="public/models/avatars/base_male.glb")

print("\n=== BASE_MALE.GLB DETAILS ===")
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        print(f"Mesh Object: {obj.name}")
        for slot in obj.material_slots:
            if slot.material:
                print(f"  Material: {slot.material.name}")
                if slot.material.use_nodes:
                    for n in slot.material.node_tree.nodes:
                        if n.type == 'TEX_IMAGE' and n.image:
                            print(f"    Texture Image: {n.image.name}, filepath: {n.image.filepath}")
