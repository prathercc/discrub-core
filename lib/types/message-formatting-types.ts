export interface UserMentionFormat {
  raw: string;
  userName: string;
  id: string;
}

export interface ChannelFormat {
  channelId: string | undefined;
  raw: string;
}

export interface UnderLineFormat {
  text: string;
  raw: string;
}

export interface CodeFormat {
  text: string;
  raw: string;
}

export interface ItalicsFormat {
  text: string;
  raw: string;
}

export interface BoldFormat {
  text: string;
  raw: string;
}

export interface LinkFormat {
  url: string;
  text: string;
  description: string;
  raw: string;
}

export interface QuoteFormat {
  text: string;
  raw: string;
}

export interface HyperLinkFormat {
  raw: string;
}

export interface EmojiFormat {
  raw: string;
  name: string;
  id: string;
}

export interface SpecialFormatting {
  userMention: UserMentionFormat[];
  channel: ChannelFormat[];
  underLine: UnderLineFormat[];
  code: CodeFormat[];
  italics: ItalicsFormat[];
  bold: BoldFormat[];
  link: LinkFormat[];
  quote: QuoteFormat[];
  hyperLink: HyperLinkFormat[];
  emoji: EmojiFormat[];
}

export interface SpecialFormattingContext {
  userMap: Record<string, { userName?: string | null; displayName?: string | null }>;
  guildRoles: Array<{ id: string; name: string }>;
}
