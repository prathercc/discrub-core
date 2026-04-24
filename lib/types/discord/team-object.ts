// https://discord.com/developers/docs/topics/teams#data-models-team-object
import type { TeamMemberObject } from "./team-member-object";

export type TeamObject = {
  icon: string | null | undefined;
  id: string;
  members: TeamMemberObject[];
  name: string;
  owner_user_id: string;
};