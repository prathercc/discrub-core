// https://discord.com/developers/docs/resources/poll#poll-object
//
// A Poll attached to a Message. `results` is only present on fetched/closed
// polls — live polls omit it until finalized — so consumers render the
// question + answers unconditionally but vote counts only when `results`
// exists. Discord strips the original author from forwarded snapshots but
// preserves the poll payload verbatim.

export type PollMediaObject = {
  text?: string | null;
  emoji?: {
    id?: string | null;
    name?: string | null;
    animated?: boolean | null;
  } | null;
};

export type PollAnswerObject = {
  answer_id: number;
  poll_media?: PollMediaObject | null;
};

export type PollAnswerCountObject = {
  id: number;
  count: number;
  me_voted?: boolean;
};

export type PollResultsObject = {
  is_finalized?: boolean;
  answer_counts?: PollAnswerCountObject[] | null;
};

export type PollObject = {
  question?: PollMediaObject | null;
  answers?: PollAnswerObject[] | null;
  expiry?: string | null;
  allow_multiselect?: boolean;
  layout_type?: number;
  results?: PollResultsObject | null;
};
