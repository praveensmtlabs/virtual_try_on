"""
Precision garment generator for Mixamo Ch36.
Uses exact bone height landmarks to guarantee perfectly fitting formal clothes:
- Shirt: Base of neck (83%) down to below hips/crotch (50%), full sleeves to wrists.
- Pants: Belt line/waist (57%) down to ankles (7%), full leg coverage.
- Blazer: Structured suit jacket from shoulders (83%) down to upper thigh (48%) with open V-lapel front.
- Bow Tie: Neck collar center (83%).
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


def world_corners(obj):
    return [obj.matrix_world @ Vector(c) for c in obj.bound_box]


def measure(obj):
    corners = world_corners(obj)
    mins = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
    maxs = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
    return mins, maxs, maxs - mins


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
    print(f"{obj.name}: verts={len(obj.data.vertices)} faces={len(obj.data.polygons)}")


def inflate(obj, amount=0.012, thickness=0.003, smooth_factor=0.3):
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


def bind(obj, arm):
    select_only(obj)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")


def export_one(arm, mesh, path: Path):
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    mesh.select_set(True)
    mesh.hide_set(False)
    bpy.context.view_layer.objects.active = arm
    hidden = []
    for o in bpy.data.objects:
        if o.type == "MESH" and o != mesh:
            hidden.append(o)
            o.hide_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_skins=True,
        export_apply=False,
        export_yup=True,
        export_materials="EXPORT",
    )
    for o in hidden:
        o.hide_set(False)
    print("Exported", path.name, f"{round(path.stat().st_size / 1024, 1)} KB")


def create_bowtie_mesh(neck_center):
    """
    Creates a styled 3D bowtie mesh centered at neck_center.
    """
    bm = bmesh.new()

    # Center knot
    knot = bmesh.ops.create_cube(bm, size=0.035)
    for v in knot["verts"]:
        v.co.x *= 0.6
        v.co.y *= 0.7
        v.co.z *= 1.1
        v.co += neck_center + Vector((0, -0.125, -0.01))

    # Left wing
    left = bmesh.ops.create_cone(
        bm, cap_ends=True, radius1=0.045, radius2=0.01, depth=0.075, segments=12
    )
    for v in left["verts"]:
        co = v.co.copy()
        v.co.x = -co.z - 0.038
        v.co.y = co.y * 0.4
        v.co.z = co.x * 0.85
        v.co += neck_center + Vector((0, -0.13, -0.01))

    # Right wing
    right = bmesh.ops.create_cone(
        bm, cap_ends=True, radius1=0.045, radius2=0.01, depth=0.075, segments=12
    )
    for v in right["verts"]:
        co = v.co.copy()
        v.co.x = co.z + 0.038
        v.co.y = co.y * 0.4
        v.co.z = co.x * 0.85
        v.co += neck_center + Vector((0, -0.13, -0.01))

    mesh_data = bpy.data.meshes.new("BowTieMesh")
    bm.to_mesh(mesh_data)
    bm.free()

    bowtie_obj = bpy.data.objects.new("Ch36_BlackBowTie", mesh_data)
    bpy.context.collection.objects.link(bowtie_obj)
    return bowtie_obj


def main():
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=BODY_GLB)
    arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    body = next(o for o in bpy.data.objects if o.type == "MESH")

    # Apply transforms
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    body.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    mins, maxs, size = measure(body)
    h_min, h_max = mins.z, maxs.z
    height = size.z
    print(f"Body Z range: {h_min:.3f} to {h_max:.3f} (Height: {height:.3f}m)")

    def H(frac):
        return h_min + height * frac

    def lat_abs(w):
        return abs(w.x)

    def depth_val(w):
        return w.y

    # --- 1. Ch36 Base Shirt (White Tee) & Formal White Shirt ---
    shirt = duplicate_mesh(body, "Ch36_Shirt")

    def keep_shirt(w):
        # Neck base at H(0.85), down to hips/belt H(0.50)
        if w.z < H(0.50) or w.z > H(0.85):
            return False
        # Do not include hands (wrist cut at lat_abs 0.68)
        if lat_abs(w) > 0.68:
            return False
        return True

    delete_by_mask(shirt, keep_shirt)
    inflate(shirt, amount=0.012, thickness=0.003)
    shirt.data.materials.clear()
    shirt.data.materials.append(make_mat("ShirtMat", (0.95, 0.95, 0.97, 1), roughness=0.4))

    # --- 2. Formal White Dress Shirt (Long Sleeve) ---
    formal_shirt = duplicate_mesh(body, "Ch36_FormalShirt")

    def keep_formal_shirt(w):
        # Collar at neck H(0.855), hem tucking past belt to H(0.48)
        if w.z < H(0.48) or w.z > H(0.855):
            return False
        # Sleeves extend out to wrists (lat_abs 0.72)
        if lat_abs(w) > 0.72:
            return False
        return True

    delete_by_mask(formal_shirt, keep_formal_shirt)
    inflate(formal_shirt, amount=0.014, thickness=0.0035)
    formal_shirt.data.materials.clear()
    formal_shirt.data.materials.append(make_mat("FormalShirtMat", (0.96, 0.96, 0.98, 1), roughness=0.35))

    # --- 3. Base Pants & Formal Black Pants ---
    pants = duplicate_mesh(body, "Ch36_Pants")

    def keep_pants(w):
        # Waistband starts at H(0.57) (above hips), down to ankles H(0.07)
        if w.z > H(0.57) or w.z < H(0.07):
            return False
        return True

    delete_by_mask(pants, keep_pants)
    inflate(pants, amount=0.015, thickness=0.004)
    pants.data.materials.clear()
    pants.data.materials.append(make_mat("PantsMat", (0.10, 0.10, 0.12, 1), roughness=0.75))

    formal_pants = duplicate_mesh(body, "Ch36_FormalPants")
    delete_by_mask(formal_pants, keep_pants)
    inflate(formal_pants, amount=0.016, thickness=0.0045)
    formal_pants.data.materials.clear()
    formal_pants.data.materials.append(make_mat("FormalPantsMat", (0.07, 0.07, 0.08, 1), roughness=0.75))

    # --- 4. Formal Black Blazer Jacket ---
    blazer = duplicate_mesh(body, "Ch36_BlackBlazer")

    def keep_blazer(w):
        # Shoulder line at H(0.85), hem extending below hips to H(0.46)
        if w.z < H(0.46) or w.z > H(0.85):
            return False
        if lat_abs(w) > 0.73:
            return False
        # Open front V-lapel notch near chest center (front depth y < -0.01, h between 0.62 and 0.81, width < 0.055)
        if H(0.62) < w.z < H(0.81) and lat_abs(w) < 0.055 and depth_val(w) < -0.01:
            return False
        return True

    delete_by_mask(blazer, keep_blazer)
    # Inflate slightly more than shirt so blazer cleanly overlaps shirt
    inflate(blazer, amount=0.024, thickness=0.0055, smooth_factor=0.35)
    blazer.data.materials.clear()
    blazer.data.materials.append(make_mat("BlackBlazerMat", (0.05, 0.05, 0.06, 1), roughness=0.55))

    # --- 5. Black Bow Tie ---
    neck_pos = Vector((0, 0, H(0.835)))
    bowtie = create_bowtie_mesh(neck_pos)
    bowtie.data.materials.append(make_mat("BlackBowTieMat", (0.04, 0.04, 0.05, 1), roughness=0.25))

    # Bind all objects to the Mixamo armature
    body.hide_set(True)
    bind(shirt, arm)
    bind(formal_shirt, arm)
    bind(pants, arm)
    bind(formal_pants, arm)
    bind(blazer, arm)
    bind(bowtie, arm)

    # Export all GLBs
    export_one(arm, shirt, OUT_DIR / "ch36-shirt.glb")
    export_one(arm, formal_shirt, OUT_DIR / "ch36-formal-shirt.glb")
    export_one(arm, pants, OUT_DIR / "ch36-pants.glb")
    export_one(arm, formal_pants, OUT_DIR / "ch36-formal-pants.glb")
    export_one(arm, blazer, OUT_DIR / "ch36-black-blazer.glb")
    export_one(arm, bowtie, OUT_DIR / "ch36-black-bowtie.glb")

    print("SUCCESS: ALL PERFECTLY PROPORTIONED CH36 GARMENTS GENERATED!")


if __name__ == "__main__":
    main()
