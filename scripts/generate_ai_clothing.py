"""
High-Quality Tailored Gemini AI 3D Garment Generator & Rigging Engine for Mixamo Ch36.
Fixes neck trap gaps, side seam clipping, placket length, and collar wrapping.
"""
from __future__ import annotations

import sys
from pathlib import Path
import math

import bpy
import bmesh
from mathutils import Vector, Euler, Matrix

args = sys.argv[sys.argv.index("--") + 1 :]
CATEGORY = args[0].lower()       # 'shirt', 'tshirt', 'pants', or 'blazer'
HEX_COLOR = args[1]              # e.g., '#f9a8d4' or '#ffffff'
ROUGHNESS = float(args[2])       # e.g., 0.45
METALLIC = float(args[3])        # e.g., 0.0
STYLE = args[4].lower()          # 'formal', 'casual', 'slim-fit', or 'oversized'
OUT_GLB_PATH = Path(args[5])
OUT_GLB_PATH.parent.mkdir(parents=True, exist_ok=True)

MASTER_AVATAR_GLB = Path("public/models/avatars/ch36-mixamo.min.glb")


def hex_to_rgb(hex_str):
    hex_clean = hex_str.lstrip('#')
    if len(hex_clean) == 3:
        hex_clean = ''.join([c*2 for c in hex_clean])
    r = int(hex_clean[0:2], 16) / 255.0
    g = int(hex_clean[2:4], 16) / 255.0
    b = int(hex_clean[4:6], 16) / 255.0
    return (r, g, b, 1.0)


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def select_only(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def duplicate_mesh(src, name):
    new = src.copy()
    new.data = src.data.copy()
    new.name = name
    new.data.name = name
    bpy.context.collection.objects.link(new)
    for mod in list(new.modifiers):
        new.modifiers.remove(mod)
    mw = src.matrix_world.copy()
    new.parent = None
    new.matrix_world = mw
    return new


def delete_by_mask(obj, keep_fn):
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
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")


def inflate(obj, amount=0.022, thickness=0.004, smooth_factor=0.35):
    select_only(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.transform.shrink_fatten(value=amount)
    bpy.ops.object.mode_set(mode="OBJECT")

    if thickness > 0:
        mod = obj.modifiers.new("Solidify", "SOLIDIFY")
        mod.thickness = thickness
        mod.offset = 1.0
        bpy.ops.object.modifier_apply(modifier=mod.name)

    if smooth_factor > 0:
        sm = obj.modifiers.new("Smooth", "SMOOTH")
        sm.factor = smooth_factor
        sm.iterations = 4
        bpy.ops.object.modifier_apply(modifier=sm.name)

    select_only(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")


def make_mat(name, hex_color, roughness=0.45, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = hex_to_rgb(hex_color)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def create_shirt_collar(neck_center, color_mat):
    """Generates a turned-down 3D dress shirt collar wrapping snuggly around the neck base."""
    bpy.ops.mesh.primitive_torus_add(
        align="WORLD",
        location=(neck_center.x, neck_center.y - 0.005, neck_center.z - 0.005),
        rotation=(math.radians(12), 0, 0),
        major_radius=0.068,
        minor_radius=0.016,
        major_segments=32,
        minor_segments=12
    )
    collar = bpy.context.active_object
    collar.name = "ShirtCollar"
    collar.scale = Vector((1.0, 1.15, 0.70))
    select_only(collar)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    collar.data.materials.append(color_mat)

    # Collar flap points at front neck
    bpy.ops.mesh.primitive_cone_add(
        radius1=0.022, radius2=0.002, depth=0.045,
        location=(0.024, -0.075, neck_center.z - 0.028),
        rotation=(math.radians(65), math.radians(-12), math.radians(-8))
    )
    flap_l = bpy.context.active_object
    flap_l.data.materials.append(color_mat)

    bpy.ops.mesh.primitive_cone_add(
        radius1=0.022, radius2=0.002, depth=0.045,
        location=(-0.024, -0.075, neck_center.z - 0.028),
        rotation=(math.radians(65), math.radians(12), math.radians(8))
    )
    flap_r = bpy.context.active_object
    flap_r.data.materials.append(color_mat)

    select_only(collar)
    flap_l.select_set(True)
    flap_r.select_set(True)
    bpy.ops.object.join()
    return bpy.context.active_object


def create_placket_and_buttons(neck_z, bottom_z, color_mat):
    """Creates a center front button placket terminating at the waistband."""
    p_height = (neck_z - 0.03) - bottom_z
    p_center_z = (neck_z - 0.03 + bottom_z) / 2.0
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(0.0, -0.155, p_center_z)
    )
    placket = bpy.context.active_object
    placket.scale = Vector((0.022, 0.004, p_height))
    select_only(placket)
    bpy.ops.object.transform_apply(scale=True)
    placket.data.materials.append(color_mat)

    # White dress shirt buttons
    btn_mat = make_mat("ShirtButtonMat", "#ffffff", roughness=0.2, metallic=0.1)
    buttons = []
    num_btns = 5
    z_step = p_height / (num_btns + 1)
    for i in range(1, num_btns + 1):
        bz = bottom_z + i * z_step
        bpy.ops.mesh.primitive_cylinder_add(
            radius=0.005, depth=0.004,
            location=(0.0, -0.158, bz),
            rotation=(math.radians(90), 0, 0)
        )
        btn = bpy.context.active_object
        btn.data.materials.append(btn_mat)
        buttons.append(btn)

    select_only(placket)
    for b in buttons:
        b.select_set(True)
    bpy.ops.object.join()
    return bpy.context.active_object


def limit_vertex_weights(mesh_obj, max_weights=4):
    select_only(mesh_obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.object.mode_set(mode="OBJECT")

    for v in mesh_obj.data.vertices:
        groups = sorted(v.groups, key=lambda g: g.weight, reverse=True)
        if len(groups) > max_weights:
            for g in groups[max_weights:]:
                mesh_obj.vertex_groups[g.group].remove([v.index])

    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    bpy.ops.object.mode_set(mode="OBJECT")


def main():
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(MASTER_AVATAR_GLB))
    arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    body = next(o for o in bpy.data.objects if o.type == "MESH")

    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    body.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    bone_z = {}
    for b in arm.data.bones:
        name = b.name.split(":")[-1]
        head_z = (arm.matrix_world @ b.head_local).z
        bone_z[name] = head_z

    z_foot = bone_z.get("LeftFoot", 0.531)
    z_knee = bone_z.get("LeftLeg", 0.950)
    z_crotch = bone_z.get("LeftUpLeg", 1.376)
    z_hips = bone_z.get("Hips", 1.430)
    z_spine2 = bone_z.get("Spine2", 1.770)
    z_neck = bone_z.get("Neck", 1.915)

    def lat_abs(w):
        return abs(w.x)

    def depth_val(w):
        return w.y

    ease_amount = 0.016 if "slim" in STYLE else (0.026 if "oversized" in STYLE else 0.022)
    garment_mesh = duplicate_mesh(body, "Gemini_Garment_Base")

    color_mat = make_mat("GeminiGarmentMat", HEX_COLOR, roughness=ROUGHNESS, metallic=METALLIC)

    if CATEGORY in ["shirt", "tshirt"]:
        max_sleeve_x = 0.42 if CATEGORY == "tshirt" else 0.70
        bottom_shirt_z = z_hips + 0.01  # Tucked neatly into waistband at 1.44m

        def keep_top(w):
            if w.z > (z_neck + 0.035) or w.z < bottom_shirt_z:
                return False
            if lat_abs(w) > max_sleeve_x:
                return False
            return True

        delete_by_mask(garment_mesh, keep_top)
        inflate(garment_mesh, amount=ease_amount, thickness=0.004)
        garment_mesh.data.materials.clear()
        garment_mesh.data.materials.append(color_mat)

        # Add 3D Collar & Placket for Dress Shirts
        collar_obj = create_shirt_collar(Vector((0.0, 0.0, z_neck)), color_mat)
        placket_obj = create_placket_and_buttons(z_neck, bottom_shirt_z, color_mat)

        select_only(garment_mesh)
        collar_obj.select_set(True)
        placket_obj.select_set(True)
        bpy.ops.object.join()
        garment_mesh = bpy.context.active_object

    elif CATEGORY == "blazer":
        bottom_blazer_z = z_crotch - 0.05

        def keep_blazer(w):
            if w.z > (z_neck + 0.035) or w.z < bottom_blazer_z:
                return False
            if lat_abs(w) > 0.71:
                return False
            if 1.62 < w.z < 1.88 and lat_abs(w) < 0.05 and depth_val(w) < -0.01:
                return False
            return True

        delete_by_mask(garment_mesh, keep_blazer)
        inflate(garment_mesh, amount=ease_amount + 0.008, thickness=0.005, smooth_factor=0.35)
        garment_mesh.data.materials.clear()
        garment_mesh.data.materials.append(color_mat)

        collar_obj = create_shirt_collar(Vector((0.0, 0.0, z_neck)), color_mat)
        placket_obj = create_placket_and_buttons(z_neck, bottom_blazer_z, color_mat)

        select_only(garment_mesh)
        collar_obj.select_set(True)
        placket_obj.select_set(True)
        bpy.ops.object.join()
        garment_mesh = bpy.context.active_object

    elif CATEGORY == "pants":
        def keep_pants(w):
            if w.z > (z_hips + 0.03) or w.z < (z_foot - 0.02):
                return False
            if w.z > z_crotch and lat_abs(w) > 0.26:
                return False
            if w.z <= z_crotch and lat_abs(w) > 0.32:
                return False
            return True

        delete_by_mask(garment_mesh, keep_pants)
        inflate(garment_mesh, amount=ease_amount, thickness=0.0045)
        garment_mesh.data.materials.clear()
        garment_mesh.data.materials.append(color_mat)

    garment_mesh.name = "Fitted_Garment"

    # Skin to Mixamo Armature
    body.hide_set(True)
    select_only(garment_mesh)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")

    limit_vertex_weights(garment_mesh, max_weights=4)

    # Export Production GLB
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    garment_mesh.select_set(True)
    bpy.context.view_layer.objects.active = arm

    bpy.ops.export_scene.gltf(
        filepath=str(OUT_GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_skins=True,
        export_apply=False,
        export_yup=True,
        export_materials="EXPORT",
    )

    print(f"TAILORED GEMINI 3D PIPELINE EXPORT SUCCESS: {OUT_GLB_PATH.name} ({round(OUT_GLB_PATH.stat().st_size / 1024, 1)} KB)")


if __name__ == "__main__":
    main()
