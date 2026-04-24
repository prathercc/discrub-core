// https://discord.com/developers/docs/resources/channel#embed-object
import { EmbedType } from "../../enum/discord-enum.ts";
import type { EmbedAuthorObject } from "./embed-author-object";
import type { EmbedFieldObject } from "./embed-field-object";
import type { EmbedFooterObject } from "./embed-footer-object";
import type { EmbedImageObject } from "./embed-image-object";
import type { EmbedProviderObject } from "./embed-provider-object";
import type { EmbedThumbnailObject } from "./embed-thumbnail-object";
import type { EmbedVideoObject } from "./embed-video-object";

export type Embed = {
  title?: string;
  type?: EmbedType;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: EmbedFooterObject;
  image?: EmbedImageObject;
  thumbnail?: EmbedThumbnailObject;
  video?: EmbedVideoObject;
  provider?: EmbedProviderObject;
  author?: EmbedAuthorObject;
  fields?: EmbedFieldObject[];
};