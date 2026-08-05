// src/vto/boneRoles.js
//
// SMPL-X bone name patterns for role resolution.
// These are the EXACT bone names used in the SMPL-X GLB garment files.
// The FBX skeleton uses Mixamo names (mixamorig1Hips, etc.) — mapping happens separately.

const SMPLX_NAMES = {
    pelvis:          ['pelvis', 'root', 'hips'],
    spine1:          ['spine1', 'spine_01', 'spine01', 'spine'],
    spine2:          ['spine2', 'spine_02', 'spine02'],
    spine3:          ['spine3', 'spine_03', 'spine03'],
    neck:            ['neck', 'neck_01'],
    head:            ['head'],
    left_collar:     ['left_collar', 'leftcollar', 'l_collar'],
    right_collar:    ['right_collar', 'rightcollar', 'r_collar'],
    left_shoulder:   ['left_shoulder', 'leftshoulder', 'l_shoulder'],
    right_shoulder:  ['right_shoulder', 'rightshoulder', 'r_shoulder'],
    left_elbow:      ['left_elbow', 'leftelbow', 'l_elbow'],
    right_elbow:     ['right_elbow', 'rightelbow', 'r_elbow'],
    left_wrist:      ['left_wrist', 'leftwrist', 'l_wrist'],
    right_wrist:     ['right_wrist', 'rightwrist', 'r_wrist'],
    left_hip:        ['left_hip', 'lefthip', 'l_hip', 'leftupleg'],
    right_hip:       ['right_hip', 'righthip', 'r_hip', 'rightupleg'],
    left_knee:       ['left_knee', 'leftknee', 'l_knee', 'leftleg'],
    right_knee:      ['right_knee', 'rightknee', 'r_knee', 'rightleg'],
    left_ankle:      ['left_ankle', 'leftankle', 'l_ankle', 'leftfoot'],
    right_ankle:     ['right_ankle', 'rightankle', 'r_ankle', 'rightfoot'],
};

// Mixamo FBX bone name patterns (what skeleton.fbx uses after stripping mixamorig/mixamorig1 prefix)
const MIXAMO_NAMES = {
    pelvis:          ['hips', 'pelvis'],
    spine1:          ['spine'],
    spine2:          ['spine1'],
    spine3:          ['spine2'],
    neck:            ['neck'],
    head:            ['head'],
    left_collar:     ['leftshoulder'],
    right_collar:    ['rightshoulder'],
    left_shoulder:   ['leftarm', 'leftupperarm'],
    right_shoulder:  ['rightarm', 'rightupperarm'],
    left_elbow:      ['leftforearm'],
    right_elbow:     ['rightforearm'],
    left_wrist:      ['lefthand'],
    right_wrist:     ['righthand'],
    left_hip:        ['leftupleg'],
    right_hip:       ['rightupleg'],
    left_knee:       ['leftleg'],
    right_knee:      ['rightleg'],
    left_ankle:      ['leftfoot'],
    right_ankle:     ['rightfoot'],
};

// Reallusion / Character Creator "CC_Base_*" bone name patterns (what female.glb uses,
// e.g. "CC_Base_L_Clavicle_049"). These always carry a numeric export id suffix, which
// normalizeName strips before matching.
const CC_BASE_NAMES = {
    pelvis:          ['hip', 'pelvis'],
    spine1:          ['waist'],
    spine2:          ['spine01'],
    spine3:          ['spine02'],
    neck:            ['necktwist01', 'necktwist02', 'neck'],
    head:            ['head'],
    left_collar:     ['l_clavicle'],
    right_collar:    ['r_clavicle'],
    left_shoulder:   ['l_upperarm'],
    right_shoulder:  ['r_upperarm'],
    left_elbow:      ['l_forearm'],
    right_elbow:     ['r_forearm'],
    left_wrist:      ['l_hand'],
    right_wrist:     ['r_hand'],
    left_hip:        ['l_thigh'],
    right_hip:       ['r_thigh'],
    left_knee:       ['l_calf'],
    right_knee:      ['r_calf'],
    left_ankle:      ['l_foot'],
    right_ankle:     ['r_foot'],
};

const ROLES = Object.keys(SMPLX_NAMES);

const normalizeName = (name) => {
    return (name || '')
        .toLowerCase()
        // Strip Mixamo prefixes like "mixamorig1", "mixamorig:", "mixamorig_"
        .replace(/^mixamorig\d*[_:]*/i, '')
        // Strip other common prefixes
        .replace(/^(cc_base_|character_|bip001_)/i, '')
        // Strip Reallusion/Character Creator numeric export-id suffixes (e.g. "_049", "_0100")
        .replace(/_\d{2,}$/i, '')
        // Remove all non-alphanumeric characters
        .replace(/[^a-z0-9]/g, '');
};

const findBoneForRole = (bones, patterns) => {
    const normalizedPatterns = patterns.map(p => p.toLowerCase().replace(/[^a-z0-9]/g, ''));
    for (const bone of bones) {
        const normalized = normalizeName(bone.name);
        if (normalizedPatterns.includes(normalized)) return bone;
    }
    // Partial match fallback
    for (const bone of bones) {
        const normalized = normalizeName(bone.name);
        if (normalizedPatterns.some(p => normalized === p || normalized.startsWith(p) || p.startsWith(normalized))) {
            return bone;
        }
    }
    return null;
};

/**
 * Resolve bone roles from a flat skeleton bones array.
 * Auto-detects whether it's an SMPL-X rig or a Mixamo rig.
 */
export function resolveBoneRoles(skeletonBones) {
    if (!Array.isArray(skeletonBones) || skeletonBones.length === 0) return {};

    // Detect rig type from bone naming convention
    const isMixamo = skeletonBones.some(b => /mixamorig/i.test(b.name || ''));
    const isCCBase = !isMixamo && skeletonBones.some(b => /^cc_base_/i.test(b.name || ''));
    const nameMap = isMixamo ? MIXAMO_NAMES : isCCBase ? CC_BASE_NAMES : SMPLX_NAMES;
    const rigLabel = isMixamo ? 'Mixamo' : isCCBase ? 'CC_Base' : 'SMPL-X';

    console.log('[resolveBoneRoles] Detected rig type:', rigLabel);
    console.log('[resolveBoneRoles] Sample bone names:', skeletonBones.slice(0, 5).map(b => b.name));

    const roleMap = {};
    for (const role of ROLES) {
        const patterns = nameMap[role] || [];
        roleMap[role] = findBoneForRole(skeletonBones, patterns);
    }

    console.log('[resolveBoneRoles] Mapped roles:', Object.keys(roleMap).filter(k => roleMap[k]).map(k => `${k}: ${roleMap[k].name}`));
    return roleMap;
}
