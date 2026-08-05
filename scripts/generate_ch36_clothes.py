"""
Generate shirt/pants from the SAME GLB the app uses as Adult Male,
so armature space matches 1:1.
"""
from __future__ import annotations

import math
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
    up = "y"  # glTF default
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


def inflate(obj, amount=0.012, thickness=0.004):
    select_only(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.transform.shrink_fatten(value=amount)
    bpy.ops.object.mode_set(mode="OBJECT")
    mod = obj.modifiers.new("Solidify", "SOLIDIFY")
    mod.thickness = thickness
    mod.offset = 1.0
    bpy.ops.object.modifier_apply(modifier=mod.name)
    sm = obj.modifiers.new("Smooth", "SMOOTH")
    sm.factor = 0.3
    sm.iterations = 5
    bpy.ops.object.modifier_apply(modifier=sm.name)
    select_only(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")


def make_mat(name, color, roughness=0.7):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
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
    print("Exported", path, "KB", round(path.stat().st_size / 1024, 1))


def axis_val(v, up):
    return {"x": v.x, "y": v.y, "z": v.z}[up]


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

    # Lateral axes (not up)
    lat = "x" if up != "x" else "y"

    def lat_abs(w):
        return abs(w.x if lat == "x" else w.y)

    shirt = duplicate_mesh(body, "Ch36_Shirt")

    def keep_shirt(w):
        h = axis_val(w, up)
        if h < H(0.50) or h > H(0.88):
            return False
        if lat_abs(w) > 0.70:
            return False
        if lat_abs(w) > 0.55 and h < H(0.72):
            return False
        return True

    delete_by_mask(shirt, keep_shirt)
    if len(shirt.data.polygons) < 40:
        raise RuntimeError("Shirt empty")
    inflate(shirt, 0.014, 0.0045)
    shirt.data.materials.clear()
    shirt.data.materials.append(make_mat("ShirtMat", (0.93, 0.93, 0.95, 1)))

    pants = duplicate_mesh(body, "Ch36_Pants")

    def keep_pants(w):
        h = axis_val(w, up)
        if h > H(0.56) or h < H(0.02):
            return False
        if h > H(0.45) and lat_abs(w) > 0.32:
            return False
        return True

    delete_by_mask(pants, keep_pants)
    if len(pants.data.polygons) < 40:
        raise RuntimeError("Pants empty")
    inflate(pants, 0.016, 0.005)
    pants.data.materials.clear()
    pants.data.materials.append(make_mat("PantsMat", (0.12, 0.16, 0.22, 1), 0.88))

    body.hide_set(True)
    bind(shirt, arm)
    bind(pants, arm)

    export_one(arm, shirt, OUT_DIR / "ch36-shirt.glb")
    export_one(arm, pants, OUT_DIR / "ch36-pants.glb")
    print("DONE")


if __name__ == "__main__":
    main()
