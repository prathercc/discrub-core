import { AuthorType, HasType, IsPinnedType } from "../../enum/discord-enum";

export type SearchCriteria = {
  searchBeforeDate: Date | null | undefined;
  searchAfterDate: Date | null | undefined;
  searchMessageContent: string | null | undefined;
  selectedHasTypes: HasType[];
  userIds: string[];
  mentionIds: string[];
  channelIds: string[];
  isPinned: IsPinnedType;
  authorType?: AuthorType | null;
};