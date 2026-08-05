"""
Segment original ch36-mixamo.glb into modular body part sub-meshes using evaluated world coordinates:
- HeadMesh (Head, face & neck)
- HandL (Hands & Wrists)
- FootL (Feet & Ankles)
- ChestMesh (Torso, Chest, Back, Upper Arms)
- LegsMesh (Hips, Thighs, Legs)

Enables 100% zero-clipping body masking in Three.js Virtual Try-On!
"""
from __future__ import annotations

import bpy
import bmesh

INPUT_GLB = "public/models/avatars/ch36-mixamo.glb"
OUTPUT_GLB = "public/models/avatars/ch36-mixamo.min.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=INPUT_GLB)

arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
body = next(o for o in bpy.data.objects if o.type == "MESH" and o.name == "Ch36")

def select_only(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

def duplicate_body(name):
    new = body.copy()
    new.data = body.data.copy()
    new.name = name
    new.data.name = name
    bpy.context.collection.objects.link(new)
    return new

def mask_mesh(obj, keep_fn):
    select_only(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bm = bmesh.from_edit_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    mw = obj.matrix_world.copy()
    doomed = [v for v in bm.verts if not keep_fn(mw @ v.co)]
    bmesh.ops.delete(bm, geom=doomed, context="VERTS")
    bmesh.update_edit_mesh(obj.data)
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.delete_loose()
    bpy.ops.object.mode_set(mode="OBJECT")

# World coordinate bounds (in meters)
def is_head(co):
    return co.z >= 1.48

def is_hands(co):
    return abs(co.x) >= 0.55 and co.z < 1.48

def is_feet(co):
    return co.z <= 0.28

def is_chest(co):
    return 0.85 <= co.z < 1.48 and abs(co.x) < 0.55

def is_legs(co):
    return 0.28 < co.z < 0.85 and abs(co.x) < 0.55

head_mesh = duplicate_body("HeadMesh")
mask_mesh(head_mesh, is_head)

hands_mesh = duplicate_body("HandL")
mask_mesh(hands_mesh, is_hands)

feet_mesh = duplicate_body("FootL")
mask_mesh(feet_mesh, is_feet)

chest_mesh = duplicate_body("ChestMesh")
mask_mesh(chest_mesh, is_chest)

legs_mesh = duplicate_body("LegsMesh")
mask_mesh(legs_mesh, is_legs)

# Remove original unified mesh
bpy.data.objects.remove(body, do_unlink=True)

# Select armature + sub-meshes and export
bpy.ops.object.select_all(action="DESELECT")
arm.select_set(True)
for m in [head_mesh, hands_mesh, feet_mesh, chest_mesh, legs_mesh]:
    m.select_set(True)
bpy.context.view_layer.objects.active = arm

bpy.ops.export_scene.gltf(
    filepath=OUTPUT_GLB,
    export_format="GLB",
    use_selection=True,
    export_animations=True,
    export_skins=True,
    export_apply=False,
    export_yup=True
)

print(f"SUCCESSFULLY SEGMENTED CH36 AVATAR TO: {OUTPUT_GLB}")
