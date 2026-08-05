export type AnimationId =
  | "idle"
  | "standing"
  | "walk"
  | "run"
  | "turnLeft"
  | "turnRight"
  | "walkToward"
  | "walkAway";

export interface AnimationClipDef {
  id: AnimationId;
  name: string;
  loop: boolean;
  description: string;
}
