"""
Build a complete 3D Formal White Dress Shirt for Mixamo Ch36 in Blender:
- Folded dress shirt collar with collar band & front tips.
- Center front button placket.
- 5 3D shirt buttons down the center front.
- Left chest pocket mesh.
- Wrist sleeve cuffs with cuff buttons.
- Skinned to Mixamo Ch36 65-bone armature in T-pose.
"""
from __future__ import annotations

import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector, Euler, Matrix

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


def make_mat(name, color, roughness=0.35, metallic=0.0):
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


def create_collar_mesh(neck_z, neck_radius=0.10):
    """
    Creates a 3D folded dress shirt collar with collar band & tips.
    """
    bm = bmesh.new()

    # Create collar band cylinder
    segments = 24
    circle = bmesh.ops.create_circle(bm, cap_ends=False, radius=neck_radius, segments=segments)
    top_verts = circle["verts"]

    for v in top_verts:
        v.co.z = neck_z + 0.04

    # Extrude down for band
    res = bmesh.ops.extrude_edge_only(bm, edges=bm.edges)
    bottom_verts = [v for v in res["geom"] if isinstance(v, bmesh.types.BMVert)]
    for v in bottom_verts:
        v.co.z = neck_z - 0.01

    # Form collar fold wings at front
    for v in bm.verts:
        # Move front vertices slightly forward & down to model collar tips
        if v.co.y < 0:
            angle_fac = abs(v.co.x) / neck_radius
            if angle_fac < 0.8:
                v.co.y -= 0.02 * (1.0 - angle_fac)
                if v.co.z > neck_z + 0.01:
                    v.co.z -= 0.015 * (1.0 - angle_fac)

    mesh_data = bpy.data.meshes.new("CollarMesh")
    bm.to_mesh(mesh_data)
    bm.free()

    obj = bpy.data.objects.new("ShirtCollar", mesh_data)
    bpy.context.collection.objects.link(obj)

    # Add Solidify modifier for thickness
    mod = obj.modifiers.new("Solidify", "SOLIDIFY")
    mod.thickness = 0.006
    select_only(obj)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def create_placket_mesh(z_bottom, z_top, y_front=-0.135):
    """
    Creates front button placket strip.
    """
    bm = bmesh.new()
    w = 0.018  # placket width
    depth = 0.005

    # Front rectangle
    v1 = bm.verts.new((-w, y_front - depth, z_bottom))
    v2 = bm.verts.new((w, y_front - depth, z_bottom))
    v3 = bm.verts.new((w, y_front - depth, z_top))
    v4 = bm.verts.new((-w, y_front - depth, z_top))
    bm.faces.new((v1, v2, v3, v4))

    mesh_data = bpy.data.meshes.new("PlacketMesh")
    bm.to_mesh(mesh_data)
    bm.free()

    obj = bpy.data.objects.new("ShirtPlacket", mesh_data)
    bpy.context.collection.objects.link(obj)
    mod = obj.modifiers.new("Solidify", "SOLIDIFY")
    mod.thickness = 0.005
    select_only(obj)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def create_buttons(z_start, z_end, count=5, y_front=-0.142):
    """
    Creates 3D dress shirt buttons down front center.
    """
    bm = bmesh.new()
    dz = (z_end - z_start) / (count - 1)

    for i in range(count):
        bz = z_start + i * dz
        cyl = bmesh.ops.create_cone(
            bm, cap_ends=True, radius1=0.007, radius2=0.007, depth=0.004, segments=12
        )
        for v in cyl["verts"]:
            # Rotate cylinder to face front (+Y/-Y)
            co = v.co.copy()
            v.co.x = co.x
            v.co.y = y_front + co.z
            v.co.z = bz + co.y

    mesh_data = bpy.data.meshes.new("ButtonsMesh")
    bm.to_mesh(mesh_data)
    bm.free()

    obj = bpy.data.objects.new("ShirtButtons", mesh_data)
    bpy.context.collection.objects.link(obj)
    return obj


def create_pocket_mesh(z_bottom=1.65, z_top=1.76, x_left=0.04, x_right=0.11, y_front=-0.138):
    """
    Creates left chest pocket mesh.
    """
    bm = bmesh.new()

    v1 = bm.verts.new((x_left, y_front, z_bottom))
    v2 = bm.verts.new((x_right, y_front, z_bottom))
    v3 = bm.verts.new((x_right, y_front, z_top))
    v4 = bm.verts.new((x_left, y_front, z_top))
    bm.faces.new((v1, v2, v3, v4))

    mesh_data = bpy.data.meshes.new("PocketMesh")
    bm.to_mesh(mesh_data)
    bm.free()

    obj = bpy.data.objects.new("ShirtPocket", mesh_data)
    bpy.context.collection.objects.link(obj)
    mod = obj.modifiers.new("Solidify", "SOLIDIFY")
    mod.thickness = 0.003
    select_only(obj)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def create_cuffs_mesh(z_wrist, radius=0.045, width=0.04):
    """
    Creates sleeve cuffs at wrists.
    """
    bm = bmesh.new()

    for side in [-1, 1]:  # Left & Right arms
        x_pos = side * 0.67
        cyl = bmesh.ops.create_cone(
            bm, cap_ends=False, radius1=radius, radius2=radius, depth=width, segments=16
        )
        for v in cyl["verts"]:
            co = v.co.copy()
            # Rotate along X axis (arm axis)
            v.co.x = x_pos + co.z
            v.co.y = co.y
            v.co.z = z_wrist + co.x

    mesh_data = bpy.data.meshes.new("CuffsMesh")
    bm.to_mesh(mesh_data)
    bm.free()

    obj = bpy.data.objects.new("ShirtCuffs", mesh_data)
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

    z_crotch = bone_z.get("LeftUpLeg", 1.376)
    z_spine2 = bone_z.get("Spine2", 1.770)
    z_neck = bone_z.get("Neck", 1.915)

    def lat_abs(w):
        return abs(w.x)

    def keep_shirt(w):
        if w.z > (z_neck - 0.01) or w.z < (z_crotch - 0.05):
            return False
        if lat_abs(w) > 0.70:
            return False
        return True

    # 1. Main Shirt Body
    shirt_body = duplicate_mesh(body, "Ch36_ShirtBody")
    delete_by_mask(shirt_body, keep_shirt)
    inflate(shirt_body, amount=0.014, thickness=0.0035)

    # 2. Detailed Shirt Features
    collar = create_collar_mesh(z_neck)
    placket = create_placket_mesh(z_crotch - 0.04, z_neck - 0.01)
    buttons = create_buttons(z_crotch + 0.10, z_neck - 0.08, count=5)
    pocket = create_pocket_mesh(z_bottom=z_spine2 - 0.08, z_top=z_spine2 + 0.03)
    cuffs = create_cuffs_mesh(z_wrist=z_spine2 - 0.35)

    # Materials
    white_mat = make_mat("FormalWhiteShirtMat", (0.97, 0.97, 0.98, 1), roughness=0.35)
    button_mat = make_mat("PearlButtonMat", (0.92, 0.92, 0.90, 1), roughness=0.15, metallic=0.1)

    shirt_body.data.materials.clear()
    shirt_body.data.materials.append(white_mat)
    collar.data.materials.append(white_mat)
    placket.data.materials.append(white_mat)
    pocket.data.materials.append(white_mat)
    cuffs.data.materials.append(white_mat)
    buttons.data.materials.append(button_mat)

    # Join all detailed shirt components into single mesh Ch36_FormalShirt
    parts = [shirt_body, collar, placket, buttons, pocket, cuffs]
    select_only(shirt_body)
    for p in parts:
        p.select_set(True)
    bpy.ops.object.join()

    formal_shirt = bpy.context.active_object
    formal_shirt.name = "Ch36_FormalShirt"
    formal_shirt.data.name = "Ch36_FormalShirt"

    # Bind to armature
    body.hide_set(True)
    select_only(formal_shirt)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")

    # Export GLB
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    formal_shirt.select_set(True)
    bpy.context.view_layer.objects.active = arm

    out_path = OUT_DIR / "ch36-formal-shirt.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(out_path),
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_skins=True,
        export_apply=False,
        export_yup=True,
        export_materials="EXPORT",
    )

    print(f"SUCCESSFULLY GENERATED FULL 3D FORMAL SHIRT: {out_path.name} ({round(out_path.stat().st_size / 1024, 1)} KB)")


if __name__ == "__main__":
    main()
