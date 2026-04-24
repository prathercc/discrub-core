// https://discord.com/developers/docs/resources/application#application-object
import type { Guild } from "./guild";
import type { InstallParamsObject } from "./install-params-object";
import type { TeamObject } from "./team-object";
import type { User } from "./user";

export type ApplicationObject = {
  id: string;
  name: string;
  icon: string | null | undefined;
  description: string;
  rpc_origins?: string[];
  bot_public: boolean;
  bot_require_code_grant: boolean;
  bot?: User;
  terms_of_service_url?: string;
  privacy_policy_url?: string;
  owner?: User;
  summary: string;
  verify_key: string;
  team: TeamObject | null | undefined;
  guild_id?: string;
  guild?: Guild;
  primary_sku_id?: string;
  slug?: string;
  cover_image?: string;
  flags?: number;
  approximate_guild_count?: number;
  redirect_uris?: string[];
  interactions_endpoint_url?: string;
  role_connections_verification_url?: string;
  tags?: string[];
  install_params?: InstallParamsObject;
  custom_install_url?: string;
};