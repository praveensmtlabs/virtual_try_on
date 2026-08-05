# Avatar asset attribution

## Active adult avatars (try-on compatible)

| Project file | Source | Notes |
|--------------|--------|-------|
| `ch36-mixamo.min.glb` | Mixamo **Ch36** (from `Ch36_nonPBR.fbx`) | Active adult male · Mixamo skeleton `mixamorig1:*` · clothes baked into mesh (not modular) · 1024 JPEG textures |
| `base_male.glb` | Mixamo **Passive Marker Man** | Tight mocap-suit male body · ~5.4MB · `mixamorig:*` · Idle/Walk/Run via `anim-library-mixamo.glb` · body shape via regional bone scales |
| `base_female.glb` | Underwear base (try-on) | Adult female underwear · ~6MB · non-Mixamo bones mapped in-app (`Hips` / `Spine2`) |

## Fitting architecture (runtime)

- Body shapes (slim → bodybuilder → plus size) deform **bone regions** (spine, hips, shoulders, arms, legs), not a single clothing scale.
- Garments use independent chest / waist / hips / shoulders / arms / legs sizing and follow attach bones (position + yaw).
- Covered body meshes are masked when segmented; full-body skins use inset under clothes.
- **Ch36 skinned clothes:** `ch36-shirt.glb` / `ch36-pants.glb` are body-shell garments skinned to Mixamo `mixamorig1:*` and rebound to the live avatar skeleton at runtime.

## Alternates on disk

| Project file | Source | Notes |
|--------------|--------|-------|
| `mixamo-aj.glb` | Mixamo **Aj** | Casual clothed male · ~5.9MB |
| `mixamo-marker-man.glb` | Mixamo **Passive Marker Man** | Same as `base_male.glb` |
| `adult-male.glb` | Mixamo **X Bot** (Three.js) | Placeholder · ~3MB |
| `adult-female.glb` | Mixamo **Michelle** | Clothed — not used as underwear base |

## Future upgrade (when you have tools)

For true MakeHuman underwear bases + Mixamo skeleton on **both** genders:

1. Install official [MakeHuman](https://www.makehumancommunity.org/) (exports can be **CC0**).
2. Create male + female with underwear only; export FBX.
3. Sign in to [Mixamo](https://www.mixamo.com/), auto-rig each, download with skin.
4. Convert to GLB and replace `base_male.glb` / `base_female.glb`.

Do **not** use MB-Lab character meshes in a closed-source product (AGPL on generated models).

## Children

Boy / Girl use Mixamo placeholders scaled via `heightScale`.

## License

Mixamo characters: [Adobe Mixamo license](https://www.mixamo.com/). Female underwear base: keep original asset license with the file source.
