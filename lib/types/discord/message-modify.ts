import type { AllowedMentionObject } from "./allowed-mention-object";
import type { ComponentObject } from "./component-object";
import type { Message } from "./message";

export type MessageModify = Partial<
  Pick<Message, "content" | "embeds" | "flags" | "attachments">
> & {
  allowed_mentions?: AllowedMentionObject;
  components?: ComponentObject;
  payload_json?: string;
};