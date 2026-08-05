import type { AvatarDefinition, AvatarId } from "@/types/avatar";

export interface AvatarService {
  list(): Promise<AvatarDefinition[]>;
  get(id: AvatarId): Promise<AvatarDefinition | undefined>;
}
