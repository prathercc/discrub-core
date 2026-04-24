// https://discord.com/developers/docs/resources/channel#attachment-object
export type Attachment = {
  id: string;
  filename: string;
  description?: string;
  content_type?: string;
  size: number;
  url: string;
  proxy_url: string;
  height?: number | null | undefined;
  width?: number | null | undefined;
  ephemeral?: boolean;
  duration_secs?: number;
  waveform?: string;
  flags?: number;
};