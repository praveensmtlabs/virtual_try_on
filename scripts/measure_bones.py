import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="public/models/avatars/ch36-mixamo.glb")
body = next(o for o in bpy.data.objects if o.type == "MESH" and o.name == "Ch36")

print("\n=== CH36 VERTEX DETAILED Z BOUNDS ===")
zs = [v.co.z for v in body.data.vertices]
xs = [abs(v.co.x) for v in body.data.vertices]

print(f"Total Vertices: {len(zs)}")
print(f"Local Z Min: {min(zs):.4f}, Max: {max(zs):.4f}")
print(f"Local X Max: {max(xs):.4f}")

# Sort Zs to find quintile height boundaries
zs_sorted = sorted(zs)
p20 = zs_sorted[int(len(zs_sorted)*0.2)]
p40 = zs_sorted[int(len(zs_sorted)*0.4)]
p60 = zs_sorted[int(len(zs_sorted)*0.6)]
p80 = zs_sorted[int(len(zs_sorted)*0.8)]

print(f"Percentiles Z: p20={p20:.3f}, p40={p40:.3f}, p60={p60:.3f}, p80={p80:.3f}")
print("======================================\n")
