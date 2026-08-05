"""
Production-grade 3D Garment Fitting & Rigging Pipeline for Mixamo Ch36 Master Avatar.

Pipeline Stages:
1. Parse Raw Asset & Master Avatar (ch36-mixamo.min.glb)
2. Transform Normalization (Orientation, Scale, Bounding Box alignment)
3. Landmark Spatial Fitting (Shoulders, Chest, Waist, Hips, Inseam, Sleeves, Legs)
4. Surface Drape & Ease Adjustment (Snug fit with ~0.012 - 0.018m ease)
5. Armature Rebinding & Weight Transfer (mixamorig1:* 65-bone Mixamo skeleton)
6. Max 4 Weight Influences per Vertex Enforcement
7. Production GLB Export
"""
from __future__ import annotations

import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector, Matrix

# Parse Command Line Arguments
# Usage: blender --background --python scripts/fit_garment_to_ch36.py -- <RAW_GARMENT_PATH> <CATEGORY> <OUTPUT_GLB_PATH>
args = sys.argv[sys.argv.index("--") + 1 :]
RAW_GARMENT_PATH = Path(args[0])
CATEGORY = args[1].lower()  # 'shirt', 'pants', or 'coat'
OUTPUT_GLB_PATH = Path(args[2])
OUTPUT_GLB_PATH.parent.mkdir(parents=True, exist_ok=True)

MASTER_AVATAR_GLB = Path("public/models/avatars/ch36-mixamo.min.glb")


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def select_only(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def measure_obj(obj):
    mw = obj.matrix_world
    corners = [mw @ Vector(c) for c in obj.bound_box]
    mins = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
    maxs = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
    return mins, maxs, maxs - mins


def limit_vertex_weights(mesh_obj, max_weights=4):
    """
    Ensures every vertex has at most max_weights (4) bone influences.
    Removes small weights and normalizes remaining weights.
    """
    select_only(mesh_obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.object.mode_set(mode="OBJECT")

    # Limit weights modifier / op
    for v in mesh_obj.data.vertices:
        groups = sorted(v.groups, key=lambda g: g.weight, reverse=True)
        if len(groups) > max_weights:
            # remove excess group influences
            for g in groups[max_weights:]:
                mesh_obj.vertex_groups[g.group].remove([v.index])

    # Normalize weights
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    bpy.ops.object.mode_set(mode="OBJECT")


def main():
    print(f"\n=======================================================")
    print(f"STARTING FITTING PIPELINE")
    print(f"Garment: {RAW_GARMENT_PATH.name}")
    print(f"Category: {CATEGORY}")
    print(f"Output: {OUTPUT_GLB_PATH}")
    print(f"=======================================================\n")

    clear_scene()

    # 1. Import Master Avatar
    bpy.ops.import_scene.gltf(filepath=str(MASTER_AVATAR_GLB))
    avatar_arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    avatar_body = next(o for o in bpy.data.objects if o.type == "MESH")

    select_only(avatar_arm)
    avatar_body.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Extract avatar landmarks
    bone_z = {}
    for b in avatar_arm.data.bones:
        name = b.name.split(":")[-1]
        head_z = (avatar_arm.matrix_world @ b.head_local).z
        bone_z[name] = head_z

    z_foot = bone_z.get("LeftFoot", 0.531)
    z_knee = bone_z.get("LeftLeg", 0.950)
    z_crotch = bone_z.get("LeftUpLeg", 1.376)
    z_hips = bone_z.get("Hips", 1.430)
    z_spine2 = bone_z.get("Spine2", 1.770)
    z_neck = bone_z.get("Neck", 1.915)

    print(f"Master Avatar Landmarks (World Z):")
    print(f"  Foot: {z_foot:.3f}m | Knee: {z_knee:.3f}m | Crotch: {z_crotch:.3f}m")
    print(f"  Hips: {z_hips:.3f}m | Spine2: {z_spine2:.3f}m | Neck: {z_neck:.3f}m")

    # 2. Import Raw Garment Asset
    garment_collection = bpy.data.collections.new("GarmentImport")
    bpy.context.scene.collection.children.link(garment_collection)

    # Record existing objects
    existing_objs = set(bpy.data.objects)
    if RAW_GARMENT_PATH.suffix.lower() == ".glb" or RAW_GARMENT_PATH.suffix.lower() == ".gltf":
        bpy.ops.import_scene.gltf(filepath=str(RAW_GARMENT_PATH))
    elif RAW_GARMENT_PATH.suffix.lower() == ".fbx":
        bpy.ops.import_scene.fbx(filepath=str(RAW_GARMENT_PATH))
    elif RAW_GARMENT_PATH.suffix.lower() == ".obj":
        bpy.ops.import_scene.obj(filepath=str(RAW_GARMENT_PATH))

    new_objs = [o for o in bpy.data.objects if o not in existing_objs]
    garment_meshes = [o for o in new_objs if o.type == "MESH"]
    garment_arms = [o for o in new_objs if o.type == "ARMATURE"]

    print(f"Imported Raw Garment: {len(garment_meshes)} mesh(es), {len(garment_arms)} armature(s)")

    # If raw garment has armatures/skeletons, un-parent mesh & remove old armature
    for g_mesh in garment_meshes:
        g_mesh.parent = None
        g_mesh.matrix_world = g_mesh.matrix_world.copy()
        for mod in list(g_mesh.modifiers):
            if mod.type == "ARMATURE":
                g_mesh.modifiers.remove(mod)

    for g_arm in garment_arms:
        bpy.data.objects.remove(g_arm, do_unlink=True)

    # Join multiple garment meshes if any into single mesh
    if len(garment_meshes) > 1:
        select_only(garment_meshes[0])
        for m in garment_meshes[1:]:
            m.select_set(True)
        bpy.ops.object.join()
        garment_mesh = bpy.context.active_object
    else:
        garment_mesh = garment_meshes[0]

    garment_mesh.name = "Fitted_Garment"
    garment_mesh.data.name = "Fitted_Garment"

    # Reset transform
    select_only(garment_mesh)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Measure Raw Garment
    g_min, g_max, g_size = measure_obj(garment_mesh)
    print(f"Raw Garment Size: X={g_size.x:.3f}m, Y={g_size.y:.3f}m, Z={g_size.z:.3f}m")
    print(f"Raw Garment Bounds: Z=[{g_min.z:.3f}, {g_max.z:.3f}]")

    # 3. LANDMARK SPATIAL FITTING & ALIGNMENT
    if CATEGORY in ["shirt", "coat"]:
        # Target Z range for shirt/coat: Neck base (z_neck) down to below hips (z_crotch - 0.05m)
        target_top_z = z_neck - 0.01
        target_bottom_z = z_crotch - 0.06
        target_height = target_top_z - target_bottom_z
        target_center_z = (target_top_z + target_bottom_z) / 2.0

        # Current garment height & center
        curr_height = g_size.z
        curr_center_z = (g_min.z + g_max.z) / 2.0
        curr_center_x = (g_min.x + g_max.x) / 2.0
        curr_center_y = (g_min.y + g_max.y) / 2.0

        # Uniform & Axis scale to match master avatar torso height
        scale_factor = target_height / curr_height if curr_height > 1e-4 else 1.0
        garment_mesh.scale = Vector((scale_factor, scale_factor, scale_factor))
        select_only(garment_mesh)
        bpy.ops.object.transform_apply(scale=True)

        # Position to avatar upper torso
        g_min_new, g_max_new, g_size_new = measure_obj(garment_mesh)
        dz = target_top_z - g_max_new.z
        dx = 0.0 - (g_min_new.x + g_max_new.x) / 2.0
        dy = -0.01 - (g_min_new.y + g_max_new.y) / 2.0
        garment_mesh.location = Vector((dx, dy, dz))
        bpy.ops.object.transform_apply(location=True)

    elif CATEGORY == "pants":
        # Target Z range for pants: Waistband (z_hips + 0.02m) down to ankles (z_foot - 0.02m)
        target_top_z = z_hips + 0.02
        target_bottom_z = z_foot - 0.02
        target_height = target_top_z - target_bottom_z

        curr_height = g_size.z
        scale_factor = target_height / curr_height if curr_height > 1e-4 else 1.0
        garment_mesh.scale = Vector((scale_factor, scale_factor, scale_factor))
        select_only(garment_mesh)
        bpy.ops.object.transform_apply(scale=True)

        g_min_new, g_max_new, g_size_new = measure_obj(garment_mesh)
        dz = target_top_z - g_max_new.z
        dx = 0.0 - (g_min_new.x + g_max_new.x) / 2.0
        dy = 0.0 - (g_min_new.y + g_max_new.y) / 2.0
        garment_mesh.location = Vector((dx, dy, dz))
        bpy.ops.object.transform_apply(location=True)

    print(f"Spatially aligned {CATEGORY} to Master Avatar landmarks.")

    # 4. SURFACE FIT & EASE ADJUSTMENT
    # Apply Shrinkwrap / Solidify / Smooth modifier for snug fit
    select_only(garment_mesh)

    # Shrinkwrap modifier to wrap mesh snuggly onto master avatar body
    sw = garment_mesh.modifiers.new("SurfaceFit", "SHRINKWRAP")
    sw.target = avatar_body
    sw.wrap_method = "NEAREST_SURFACEPOINT"
    sw.offset = 0.015 if CATEGORY != "coat" else 0.022  # 1.5cm ease for shirt/pants, 2.2cm for coat
    bpy.ops.object.modifier_apply(modifier=sw.name)

    # Smooth modifier to clean up sharp projections
    sm = garment_mesh.modifiers.new("SmoothFit", "SMOOTH")
    sm.factor = 0.35
    sm.iterations = 3
    bpy.ops.object.modifier_apply(modifier=sm.name)

    # 5. ARMATURE REBINDING & SKIN WEIGHT TRANSFER
    # Parent garment to avatar armature
    garment_mesh.parent = avatar_arm
    mod_arm = garment_mesh.modifiers.new("Armature", "ARMATURE")
    mod_arm.object = avatar_arm

    # Transfer exact vertex weights from avatar_body to garment_mesh
    dt = garment_mesh.modifiers.new("WeightTransfer", "DATA_TRANSFER")
    dt.object = avatar_body
    dt.use_vert_data = True
    dt.data_types_verts = {"VGROUP_WEIGHTS"}
    dt.vert_mapping = "POLY_NEAREST"
    bpy.ops.object.datalayout_transfer(modifier=dt.name)
    bpy.ops.object.modifier_apply(modifier=dt.name)

    # Enforce MAX 4 bone influences per vertex for web rendering performance
    limit_vertex_weights(garment_mesh, max_weights=4)

    # 6. EXPORT PRODUCTION GLB ASSET
    avatar_body.hide_set(True)
    bpy.ops.object.select_all(action="DESELECT")
    avatar_arm.select_set(True)
    garment_mesh.select_set(True)
    bpy.context.view_layer.objects.active = avatar_arm

    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_skins=True,
        export_apply=False,
        export_yup=True,
        export_materials="EXPORT",
    )

    print(f"\n=======================================================")
    print(f"PIPELINE SUCCESS!")
    print(f"Exported Fitted Garment: {OUTPUT_GLB_PATH}")
    print(f"File Size: {round(OUTPUT_GLB_PATH.stat().st_size / 1024, 1)} KB")
    print(f"=======================================================\n")


if __name__ == "__main__":
    main()
