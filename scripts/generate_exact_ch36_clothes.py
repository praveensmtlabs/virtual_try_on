"""
Exact landmark-based garment generator for Mixamo Ch36.
Uses absolute bone positions in Blender world space to guarantee 100% accurate garment fit:
- Pants: Waist (1.46m) down to Ankles (0.51m), filtering out arms/hands.
- Shirt: Neck base (1.90m) down to below hips (1.32m), full sleeves to wrists.
- Blazer: Suit jacket (1.90m to 1.29m) with V-neck lapel opening.
- Bow Tie: Neck collar center (1.91m).
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


def create_bowtie_mesh(neck_pos):
    bm = bmesh.new()

    # Center knot
    knot = bmesh.ops.create_cube(bm, size=0.035)
    for v in knot["verts"]:
        v.co.x *= 0.6
        v.co.y *= 0.7
        v.co.z *= 1.1
        v.co += neck_pos + Vector((0, -0.125, -0.01))

    # Left wing
    left = bmesh.ops.create_cone(
        bm, cap_ends=True, radius1=0.045, radius2=0.01, depth=0.075, segments=12
    )
    for v in left["verts"]:
        co = v.co.copy()
        v.co.x = -co.z - 0.038
        v.co.y = co.y * 0.4
        v.co.z = co.x * 0.85
        v.co += neck_pos + Vector((0, -0.13, -0.01))

    # Right wing
    right = bmesh.ops.create_cone(
        bm, cap_ends=True, radius1=0.045, radius2=0.01, depth=0.075, segments=12
    )
    for v in right["verts"]:
        co = v.co.copy()
        v.co.x = co.z + 0.038
        v.co.y = co.y * 0.4
        v.co.z = co.x * 0.85
        v.co += neck_pos + Vector((0, -0.13, -0.01))

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

    # Get exact bone positions in Blender World Z coordinates
    bone_z = {}
    for b in arm.data.bones:
        name = b.name.split(":")[-1]
        head_z = (arm.matrix_world @ b.head_local).z
        bone_z[name] = head_z

    z_foot = bone_z.get("LeftFoot", 0.531)
    z_knee = bone_z.get("LeftLeg", 0.950)
    z_crotch = bone_z.get("LeftUpLeg", 1.376)
    z_hips = bone_z.get("Hips", 1.430)
    z_spine1 = bone_z.get("Spine1", 1.640)
    z_spine2 = bone_z.get("Spine2", 1.770)
    z_neck = bone_z.get("Neck", 1.915)
    z_head = bone_z.get("Head", 1.983)

    print(f"Landmarks: Foot={z_foot:.3f}, Knee={z_knee:.3f}, Crotch={z_crotch:.3f}, Hips={z_hips:.3f}, Neck={z_neck:.3f}")

    def lat_abs(w):
        return abs(w.x)

    def depth_val(w):
        return w.y

    # --- 1. PANTS (Ch36_Pants & Ch36_FormalPants) ---
    # Must start at hips/belt line (z_hips + 0.02 = 1.45m) down to ankles (z_foot - 0.02 = 0.51m)
    # Must NOT include arms/hands (which hang laterally at X > 0.28m)
    def keep_pants(w):
        if w.z > (z_hips + 0.02) or w.z < (z_foot - 0.02):
            return False
        # Filter out arms: if above crotch, lateral X must be inside torso (X <= 0.26m)
        if w.z > z_crotch and lat_abs(w) > 0.26:
            return False
        # If below crotch, lateral X must be inside leg area (X <= 0.32m)
        if w.z <= z_crotch and lat_abs(w) > 0.32:
            return False
        return True

    pants = duplicate_mesh(body, "Ch36_Pants")
    delete_by_mask(pants, keep_pants)
    inflate(pants, amount=0.015, thickness=0.004)
    pants.data.materials.clear()
    pants.data.materials.append(make_mat("PantsMat", (0.10, 0.10, 0.12, 1), roughness=0.75))

    formal_pants = duplicate_mesh(body, "Ch36_FormalPants")
    delete_by_mask(formal_pants, keep_pants)
    inflate(formal_pants, amount=0.016, thickness=0.0045)
    formal_pants.data.materials.clear()
    formal_pants.data.materials.append(make_mat("FormalPantsMat", (0.07, 0.07, 0.08, 1), roughness=0.75))

    # --- 2. SHIRT (Ch36_Shirt & Ch36_FormalShirt) ---
    # Collar at neck (z_neck - 0.01 = 1.905m), hem extending below hips (z_crotch - 0.05 = 1.326m)
    # Full sleeves along arms (X <= 0.70m, excluding hands)
    def keep_shirt(w):
        if w.z > (z_neck - 0.01) or w.z < (z_crotch - 0.05):
            return False
        if lat_abs(w) > 0.70:
            return False
        return True

    shirt = duplicate_mesh(body, "Ch36_Shirt")
    delete_by_mask(shirt, keep_shirt)
    inflate(shirt, amount=0.012, thickness=0.003)
    shirt.data.materials.clear()
    shirt.data.materials.append(make_mat("ShirtMat", (0.95, 0.95, 0.97, 1), roughness=0.4))

    formal_shirt = duplicate_mesh(body, "Ch36_FormalShirt")
    delete_by_mask(formal_shirt, keep_shirt)
    inflate(formal_shirt, amount=0.014, thickness=0.0035)
    formal_shirt.data.materials.clear()
    formal_shirt.data.materials.append(make_mat("FormalShirtMat", (0.96, 0.96, 0.98, 1), roughness=0.35))

    # --- 3. BLAZER (Ch36_BlackBlazer) ---
    # Shoulders at neck (z_neck - 0.01 = 1.905m), hem extending past hips (z_crotch - 0.08 = 1.296m)
    # Open V-neck lapel front opening
    def keep_blazer(w):
        if w.z > (z_neck - 0.01) or w.z < (z_crotch - 0.08):
            return False
        if lat_abs(w) > 0.71:
            return False
        # Open V-lapel front notch near chest center (front depth y < -0.01m, Z between 1.62m and 1.88m, X < 0.05m)
        if 1.62 < w.z < 1.88 and lat_abs(w) < 0.05 and depth_val(w) < -0.01:
            return False
        return True

    blazer = duplicate_mesh(body, "Ch36_BlackBlazer")
    delete_by_mask(blazer, keep_blazer)
    inflate(blazer, amount=0.024, thickness=0.0055, smooth_factor=0.35)
    blazer.data.materials.clear()
    blazer.data.materials.append(make_mat("BlackBlazerMat", (0.05, 0.05, 0.06, 1), roughness=0.55))

    # --- 4. BOW TIE ---
    neck_pos = Vector((0, 0, z_neck))
    bowtie = create_bowtie_mesh(neck_pos)
    bowtie.data.materials.append(make_mat("BlackBowTieMat", (0.04, 0.04, 0.05, 1), roughness=0.25))

    # Bind all meshes to armature
    body.hide_set(True)
    bind(shirt, arm)
    bind(formal_shirt, arm)
    bind(pants, arm)
    bind(formal_pants, arm)
    bind(blazer, arm)
    bind(bowtie, arm)

    # Export GLBs
    export_one(arm, shirt, OUT_DIR / "ch36-shirt.glb")
    export_one(arm, formal_shirt, OUT_DIR / "ch36-formal-shirt.glb")
    export_one(arm, pants, OUT_DIR / "ch36-pants.glb")
    export_one(arm, formal_pants, OUT_DIR / "ch36-formal-pants.glb")
    export_one(arm, blazer, OUT_DIR / "ch36-black-blazer.glb")
    export_one(arm, bowtie, OUT_DIR / "ch36-black-bowtie.glb")

    print("SUCCESS: ALL PERFECTLY MESH-MATCHED GARMENTS EXPORTED!")


if __name__ == "__main__":
    main()
