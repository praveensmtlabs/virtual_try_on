# 3D Asset Specification — ATELIER Virtual Try-On

This document defines the **drop-in contract** for production GLB assets.

## Current bundled avatars (try-on)

Adult Male / Female use **Mixamo** skeletons (`adult-male.glb` = X Bot, `adult-female.glb` = Michelle) so garments can follow bones and share locomotion clips.

Tripo / Character Creator files may exist on disk for future use but are not the active try-on targets (no shared Mixamo clothing bind).

## Honest limitation

Perfect multi-body garment fitting **cannot** be faked with uniform `scale.x/y/z`.
Production quality requires authored:

- Shared skeleton / skinning (Mixamo-compatible recommended for this studio)
- Bone weights
- Optional garment morph targets / blend shapes
- Body-part mesh groups for occlusion masking

Until then, Customize uses **fitted bone-following garments** (reliable preview), not photoreal skinned CLO assets.

## Avatars

| ID | Path | Skeleton profile |
|----|------|------------------|
| adult-male | `/models/avatars/ch36-mixamo.min.glb` | adult-male |
| adult-female | `/models/avatars/adult-female.glb` | adult-female |
| boy | `/models/avatars/boy.glb` | child-male |
| girl | `/models/avatars/girl.glb` | child-female |

### Requirements

- Format: **GLB** (Draco compression supported)
- Full body, natural **idle standing** rest pose (not T-pose / A-pose)
- Underwear / base garment only — no permanent fashion clothing
- Named bones (Mixamo-compatible preferred): `Hips`, `Spine`, `Chest`, `Neck`, `Head`, `UpperArmL/R`, `ForeArmL/R`, `HandL/R`, `UpperLegL/R`, `LowerLegL/R`, `FootL/R`
- Body mesh groups named to match masking map in `src/utils/bodyMasking.ts`
- Embedded animation clips (minimum): `Idle`, `Walk`, `Run`, `TurnLeft`, `TurnRight`
- Budget: ≤ ~80k triangles, 1–2k textures where possible

## Clothing

Categories: **coat**, **shirt**, **pants**

Bundled free garments (BlenderKit static meshes) live under `public/models/clothes/`. See `public/models/clothes/ATTRIBUTION.md`.

They are **preview overlays** (fit + bone/root track), not production skinned clothes.

Paths follow `src/data/clothing.ts`, e.g.:

- `/models/clothes/white-shirt.glb`
- `/models/clothes/charcoal-pants.glb`

### Production requirements

- Skinned to the **same skeleton profile** as compatible avatars
- Must deform with avatar animation (walk/run/turn)
- Optional morph targets named per body shape: `slim`, `average`, `athletic`, `muscular`, `bodybuilder`, `plusSize` (or mapped via `morphTargets` metadata)
- Metadata `hiddenBodyParts` lives in data/API, not inside the GLB
- Budget: ≤ ~40k triangles per garment
- Draco compression supported (`useGLTF(url, true)`)

## Thumbnails

- Avatars: `/images/avatars/{id}.png`
- Clothes: `/images/clothes/{slug}.png`

## 360 garment frames

- `/images/360/{garmentId}/000.webp` … `035.webp` (36 @ 10°)
- or `000` … `071` (72 @ 5°)
- Resolved via `getMediaUrl()` for future S3 hosting

## Media base URL

Set `NEXT_PUBLIC_MEDIA_BASE_URL` to an S3/CDN origin when leaving local `/public` hosting.
