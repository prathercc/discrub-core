// https://discord.com/developers/docs/topics/teams#data-models-team-member-object
import type { User } from "./user";

export type TeamMemberObject = {
  membership_state: number;
  team_id: string;
  user: User;
  role: string;
};