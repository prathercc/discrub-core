import type { Emoji } from "./emoji";
import type { ReactionCountDetailsObject } from "./reaction-count-details-object";

export type Reaction = {
  count: number;
  count_details: ReactionCountDetailsObject;
  me: boolean;
  me_burst: boolean;
  emoji: Emoji;
  burst_colors: string[];
};