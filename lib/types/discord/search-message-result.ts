import type { Channel } from "./channel";
import type { Message } from "./message";

export type SearchMessageResult = {
  messages: Message[];
  threads: Channel[];
  total_results: number;
};