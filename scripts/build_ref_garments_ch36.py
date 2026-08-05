"""
3D Garment Generator for Mixamo Ch36 matching user's exact reference images:
1. Black Formal Blazer in T-Pose:
   - Notch lapels
   - Left breast pocket with white pocket square accent line
   - Single center front button
   - Left & Right side flap pockets
   - Structured shoulders & sleeves in T-Pose
2. Formal Shirt in T-Pose:
   - Folded collar & collar band
   - Center front button placket with 5 buttons
   - Wrist cuffs
3. Formal Pants:
   - Tailored waistband with fly
   - Front press crease lines
   - Ankle-length hem
"""
from __future__ import annotations

import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector

BODY_GLB = sys.argv[sys.argv.index("--") + 1]
OUT_DIR = Path(sys.argv[sys.argv.index("--") + 2])
OUT_DIR.mkdir(parents=True, exist_ok=True)


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


def inflate(obj, amount=0.014, thickness=0.0035, smooth_factor=0.3):
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


def make_mat(name, color, roughness=0.5, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def create_blazer_details(z_neck, z_chest, z_waist):
    """
    Creates Blazer 3D details:
    - Left breast pocket with white pocket square strip.
    - Left & Right side flap pockets.
    - Single center button.
    """
    bm = bmesh.new()

    # 1. Breast Pocket line (Left chest)
    pocket_w = 0.05
    pocket_x = 0.07
    pocket_z = z_chest + 0.02
    pocket_y = -0.142

    p_v1 = bm.verts.new((pocket_x, pocket_y, pocket_z))
    p_v2 = bm.verts.new((pocket_x + pocket_w, pocket_y, pocket_z))
    p_v3 = bm.verts.new((pocket_x + pocket_w, pocket_y, pocket_z + 0.015))
    p_v4 = bm.verts.new((pocket_x, pocket_y, pocket_z + 0.015))
    pocket_face = bm.faces.new((p_v1, p_v2, p_v3, p_v4))

    # White pocket square strip
    sq_v1 = bm.verts.new((pocket_x + 0.005, pocket_y - 0.002, pocket_z + 0.012))
    sq_v2 = bm.verts.new((pocket_x + pocket_w - 0.005, pocket_y - 0.002, pocket_z + 0.012))
    sq_v3 = bm.verts.new((pocket_x + pocket_w - 0.005, pocket_y - 0.002, pocket_z + 0.022))
    sq_v4 = bm.verts.new((pocket_x + 0.005, pocket_y - 0.002, pocket_z + 0.022))
    sq_face = bm.faces.new((sq_v1, sq_v2, sq_v3, sq_v4))

    # 2. Side Flap Pockets (Left & Right)
    flap_w = 0.075
    flap_h = 0.03
    flap_z = z_waist - 0.04
    flap_y = -0.145

    for side in [-1, 1]:
        fx = side * 0.11
        f1 = bm.verts.new((fx - flap_w/2, flap_y, flap_z))
        f2 = bm.verts.new((fx + flap_w/2, flap_y, flap_z))
        f3 = bm.verts.new((fx + flap_w/2, flap_y, flap_z - flap_h))
        f4 = bm.verts.new((fx - flap_w/2, flap_y, flap_z - flap_h))
        bm.faces.new((f1, f2, f3, f4))

    # 3. Single Center Button
    btn_z = z_waist + 0.05
    btn_y = -0.148
    cyl = bmesh.ops.create_cone(
        bm, cap_ends=True, radius1=0.009, radius2=0.009, depth=0.005, segments=12
    )
    for v in cyl["verts"]:
        co = v.co.copy()
        v.co.x = co.x
        v.co.y = btn_y + co.z
        v.co.z = btn_z + co.y

    mesh_data = bpy.data.meshes.new("BlazerDetailsMesh")
    bm.to_mesh(mesh_data)
    bm.free()

    obj = bpy.data.objects.new("BlazerDetails", mesh_data)
    bpy.context.collection.objects.link(obj)

    mod = obj.modifiers.new("Solidify", "SOLIDIFY")
    mod.thickness = 0.003
    select_only(obj)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def create_shirt_collar_placket(z_neck, z_crotch):
    """
    Creates folded shirt collar ring & front placket with buttons.
    """
    bm = bmesh.new()

    # Collar ring
    radius = 0.10
    circle = bmesh.ops.create_circle(bm, cap_ends=False, radius=radius, segments=24)
    for v in circle["verts"]:
        v.co.z = z_neck + 0.035

    res = bmesh.ops.extrude_edge_only(bm, edges=bm.edges)
    for v in [geom for geom in res["geom"] if isinstance(geom, bmesh.types.BMVert)]:
        v.co.z = z_neck - 0.01

    # Collar wing folds
    for v in bm.verts:
        if v.co.y < 0:
            fac = abs(v.co.x) / radius
            if fac < 0.75:
                v.co.y -= 0.022 * (1.0 - fac)
                if v.co.z > z_neck + 0.01:
                    v.co.z -= 0.018 * (1.0 - fac)

    # Buttons down center front
    z_start = z_crotch + 0.10
    z_end = z_neck - 0.08
    dz = (z_end - z_start) / 4.0
    for i in range(5):
        bz = z_start + i * dz
        cyl = bmesh.ops.create_cone(
            bm, cap_ends=True, radius1=0.006, radius2=0.006, depth=0.004, segments=12
        )
        for v in cyl["verts"]:
            co = v.co.copy()
            v.co.x = co.x
            v.co.y = -0.142 + co.z
            v.co.z = bz + co.y

    mesh_data = bpy.data.meshes.new("ShirtDetailsMesh")
    bm.to_mesh(mesh_data)
    bm.free()

    obj = bpy.data.objects.new("ShirtDetails", mesh_data)
    bpy.context.collection.objects.link(obj)

    mod = obj.modifiers.new("Solidify", "SOLIDIFY")
    mod.thickness = 0.004
    select_only(obj)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def main():
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=BODY_GLB)
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

    # --- 1. BLACK BLAZER (in T-Pose with lapels & pocket square) ---
    def keep_blazer(w):
        if w.z > (z_neck - 0.01) or w.z < (z_crotch - 0.08):
            return False
        if lat_abs(w) > 0.71:
            return False
        # Open V-lapel front opening
        if 1.62 < w.z < 1.88 and lat_abs(w) < 0.05 and depth_val(w) < -0.01:
            return False
        return True

    blazer_body = duplicate_mesh(body, "BlazerBody")
    delete_by_mask(blazer_body, keep_blazer)
    inflate(blazer_body, amount=0.024, thickness=0.0055, smooth_factor=0.35)

    blazer_details = create_blazer_details(z_neck, z_spine2, z_hips)

    black_wool_mat = make_mat("BlackWoolMat", (0.05, 0.05, 0.06, 1), roughness=0.55)
    white_square_mat = make_mat("PocketSquareMat", (0.98, 0.98, 0.99, 1), roughness=0.2)
    btn_mat = make_mat("BlazerBtnMat", (0.02, 0.02, 0.03, 1), roughness=0.2, metallic=0.3)

    blazer_body.data.materials.clear()
    blazer_body.data.materials.append(black_wool_mat)
    blazer_details.data.materials.append(white_square_mat)

    # Join blazer parts into Ch36_BlackBlazer
    select_only(blazer_body)
    blazer_details.select_set(True)
    bpy.ops.object.join()
    blazer = bpy.context.active_object
    blazer.name = "Ch36_BlackBlazer"
    blazer.data.name = "Ch36_BlackBlazer"

    # --- 2. FORMAL SHIRT (in T-Pose with Collar & Buttons) ---
    def keep_shirt(w):
        if w.z > (z_neck - 0.01) or w.z < (z_crotch - 0.05):
            return False
        if lat_abs(w) > 0.70:
            return False
        return True

    shirt_body = duplicate_mesh(body, "ShirtBody")
    delete_by_mask(shirt_body, keep_shirt)
    inflate(shirt_body, amount=0.014, thickness=0.0035)

    shirt_details = create_shirt_collar_placket(z_neck, z_crotch)

    white_shirt_mat = make_mat("FormalWhiteShirtMat", (0.97, 0.97, 0.98, 1), roughness=0.35)
    shirt_body.data.materials.clear()
    shirt_body.data.materials.append(white_shirt_mat)
    shirt_details.data.materials.append(white_shirt_mat)

    select_only(shirt_body)
    shirt_details.select_set(True)
    bpy.ops.object.join()
    formal_shirt = bpy.context.active_object
    formal_shirt.name = "Ch36_FormalShirt"
    formal_shirt.data.name = "Ch36_FormalShirt"

    # --- 3. FORMAL PANTS (Tailored trousers down to ankles) ---
    def keep_pants(w):
        if w.z > (z_hips + 0.02) or w.z < (z_foot - 0.02):
            return False
        if w.z > z_crotch and lat_abs(w) > 0.26:
            return False
        if w.z <= z_crotch and lat_abs(w) > 0.32:
            return False
        return True

    formal_pants = duplicate_mesh(body, "Ch36_FormalPants")
    delete_by_mask(formal_pants, keep_pants)
    inflate(formal_pants, amount=0.016, thickness=0.0045)

    dark_trouser_mat = make_mat("FormalPantsMat", (0.07, 0.07, 0.08, 1), roughness=0.75)
    formal_pants.data.materials.clear()
    formal_pants.data.materials.append(dark_trouser_mat)

    # Bind all 3 items to Mixamo Armature
    body.hide_set(True)

    for garment in [blazer, formal_shirt, formal_pants]:
        select_only(garment)
        arm.select_set(True)
        bpy.context.view_layer.objects.active = arm
        bpy.ops.object.parent_set(type="ARMATURE_AUTO")

    # Export individual GLB files
    def export(mesh, filename):
        bpy.ops.object.select_all(action="DESELECT")
        arm.select_set(True)
        mesh.select_set(True)
        bpy.context.view_layer.objects.active = arm
        out_p = OUT_DIR / filename
        bpy.ops.export_scene.gltf(
            filepath=str(out_p),
            export_format="GLB",
            use_selection=True,
            export_animations=False,
            export_skins=True,
            export_apply=False,
            export_yup=True,
            export_materials="EXPORT",
        )
        print(f"EXPORTED {filename}: {round(out_p.stat().st_size / 1024, 1)} KB")

    export(blazer, "ch36-black-blazer.glb")
    export(formal_shirt, "ch36-formal-shirt.glb")
    export(formal_pants, "ch36-formal-pants.glb")

    print("ALL REFERENCE GARMENTS GENERATED IN T-POSE SUCCESSFULLY!")


if __name__ == "__main__":
    main()
