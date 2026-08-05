"""
Generate formal white shirt, black pants, black blazer, and black bow tie for Mixamo Ch36.
All garments are created from the avatar body GLB in T-pose and skinned to the same 65 Mixamo bones.
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


def world_corners(obj):
    return [obj.matrix_world @ Vector(c) for c in obj.bound_box]


def measure(obj):
    corners = world_corners(obj)
    mins = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
    maxs = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
    return mins, maxs, maxs - mins


def detect_up(arm) -> str:
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    hips = head = None
    for b in arm.data.edit_bones:
        n = b.name.split(":")[-1].lower()
        if n == "hips":
            hips = b
        if n == "head":
            head = b
    up = "z"  # Blender import default for GLB
    if hips and head:
        d = (arm.matrix_world @ head.head) - (arm.matrix_world @ hips.head)
        up = max([("x", abs(d.x)), ("y", abs(d.y)), ("z", abs(d.z))], key=lambda t: t[1])[0]
    bpy.ops.object.mode_set(mode="OBJECT")
    return up


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


def inflate(obj, amount=0.014, thickness=0.004, smooth_factor=0.3):
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
        sm.iterations = 5
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


def axis_val(v, up):
    return {"x": v.x, "y": v.y, "z": v.z}[up]


def create_bowtie_mesh(arm, neck_pos):
    """
    Creates a styled 3D bowtie mesh centered at neck_pos.
    """
    bm = bmesh.new()

    # Center knot
    knot = bmesh.ops.create_cube(bm, size=0.035)
    for v in knot["verts"]:
        v.co.x *= 0.6
        v.co.y *= 0.8
        v.co.z *= 1.1
        v.co += neck_pos + Vector((0, -0.13, -0.01))  # front of neck

    # Left wing
    left = bmesh.ops.create_cone(
        bm, cap_ends=True, radius1=0.045, radius2=0.01, depth=0.07, segments=12
    )
    for v in left["verts"]:
        # rotate cone horizontally pointing left
        co = v.co.copy()
        v.co.x = -co.z - 0.038
        v.co.y = co.y * 0.4
        v.co.z = co.x * 0.9
        v.co += neck_pos + Vector((0, -0.135, -0.01))

    # Right wing
    right = bmesh.ops.create_cone(
        bm, cap_ends=True, radius1=0.045, radius2=0.01, depth=0.07, segments=12
    )
    for v in right["verts"]:
        co = v.co.copy()
        v.co.x = co.z + 0.038
        v.co.y = co.y * 0.4
        v.co.z = co.x * 0.9
        v.co += neck_pos + Vector((0, -0.135, -0.01))

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

    # Apply transforms so world == local for masking
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    body.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    up = detect_up(arm)
    mins, maxs, size = measure(body)
    height = {"x": size.x, "y": size.y, "z": size.z}[up]
    h0 = axis_val(mins, up)
    print(f"Body height={height:.3f} up={up} size={[round(x,3) for x in size]}")

    def H(frac):
        return h0 + height * frac

    lat = "x" if up != "x" else "y"

    def lat_abs(w):
        return abs(w.x if lat == "x" else w.y)

    def depth_val(w):
        return w.y if up == "z" else w.z

    # 1. Formal White Shirt
    shirt = duplicate_mesh(body, "Ch36_FormalShirt")

    def keep_shirt(w):
        h = axis_val(w, up)
        if h < H(0.48) or h > H(0.88):
            return False
        if lat_abs(w) > 0.70:
            return False
        if lat_abs(w) > 0.55 and h < H(0.72):
            return False
        return True

    delete_by_mask(shirt, keep_shirt)
    inflate(shirt, amount=0.013, thickness=0.004)
    shirt.data.materials.clear()
    shirt.data.materials.append(make_mat("FormalWhiteShirtMat", (0.95, 0.95, 0.97, 1), roughness=0.4))

    # 2. Formal Black Pants
    pants = duplicate_mesh(body, "Ch36_FormalPants")

    def keep_pants(w):
        h = axis_val(w, up)
        if h > H(0.55) or h < H(0.02):
            return False
        if h > H(0.45) and lat_abs(w) > 0.32:
            return False
        return True

    delete_by_mask(pants, keep_pants)
    inflate(pants, amount=0.016, thickness=0.005)
    pants.data.materials.clear()
    pants.data.materials.append(make_mat("FormalBlackPantsMat", (0.08, 0.08, 0.09, 1), roughness=0.75))

    # 3. Formal Black Blazer
    blazer = duplicate_mesh(body, "Ch36_BlackBlazer")

    def keep_blazer(w):
        h = axis_val(w, up)
        if h < H(0.44) or h > H(0.88):
            return False
        if lat_abs(w) > 0.72:
            return False
        if lat_abs(w) > 0.56 and h < H(0.71):
            return False

        # Open V-notch at chest for formal lapel jacket
        # If near center front chest (h between 0.60 and 0.81, lat_abs < 0.05, front depth)
        d = depth_val(w)
        if H(0.62) < h < H(0.81) and lat_abs(w) < 0.055 and d < -0.01:
            return False
        return True

    delete_by_mask(blazer, keep_blazer)
    # Inflate slightly more than shirt so blazer sits on top of shirt without clipping
    inflate(blazer, amount=0.024, thickness=0.006, smooth_factor=0.35)
    blazer.data.materials.clear()
    blazer.data.materials.append(make_mat("BlackBlazerMat", (0.06, 0.06, 0.07, 1), roughness=0.55))

    # 4. Black Bow Tie
    # Find neck position from armature or body
    neck_pos = Vector((0, 0, H(0.82)))
    bowtie = create_bowtie_mesh(arm, neck_pos)
    bowtie.data.materials.append(make_mat("BlackBowTieMat", (0.04, 0.04, 0.05, 1), roughness=0.25))

    # Bind all 4 items to the armature
    body.hide_set(True)
    bind(shirt, arm)
    bind(pants, arm)
    bind(blazer, arm)
    bind(bowtie, arm)

    # Export individual GLB assets
    export_one(arm, shirt, OUT_DIR / "ch36-formal-shirt.glb")
    export_one(arm, pants, OUT_DIR / "ch36-formal-pants.glb")
    export_one(arm, blazer, OUT_DIR / "ch36-black-blazer.glb")
    export_one(arm, bowtie, OUT_DIR / "ch36-black-bowtie.glb")

    print("ALL FORMAL OUTFIT ASSETS GENERATED SUCCESSFULLY!")


if __name__ == "__main__":
    main()
