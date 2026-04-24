import type { Channel } from "./channel";
import type { Message } from "./message";
import type { ThreadMemberObject } from "./thread-member-object";

export interface ArchivedThreadsResponse {
  threads: Channel[];
  members: ThreadMemberObject[];
  has_more: boolean;
}

export interface ForumThreadSearchResponse {
  threads: Channel[];
  members: ThreadMemberObject[];
  has_more: boolean;
  first_messages: Message[];
  total_results: number;
}