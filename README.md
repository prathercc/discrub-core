# discrub-core

Core library powering [Discrub](https://github.com/prathercc/discrub-web) — a Discord data management tool for exporting, purging, and analyzing your Discord messages.

Handles all Discord API communication, message processing, export data preparation, HTML formatting, reaction enrichment, and user data enrichment.

## Installation

```bash
npm install discrub-core
```

## Architecture

```
discrub-core/
  lib/
    services/       Discord API, GitHub gist, export data
    messages/       Message retrieval pipeline (fetch, enrich, modify)
    types/          TypeScript type definitions (Discord + Discrub)
    enum/           Enums (channel types, settings, export formats)
    utils/          Utility functions (formatting, HTML, settings)
    filtering/      Message search filter logic
    guards/         Type guard functions
    regex/          Discord markdown parsing regexes
    constants/      Discord search constants
```

## Modules

### Services

#### `discord-service`
Discord API v10 wrapper with rate limiting, retry logic, and configurable delays.

```typescript
import { DiscordService } from 'discrub-core/discord-service';

const discord = new DiscordService(settings);
const messages = await discord.fetchMessages(token, channelId);
const guilds = await discord.fetchGuilds(token);
```

Handles: messages, guilds, channels, DMs, reactions, threads, search, user profiles, guild members.

#### `github-service`
Fetches announcement and donation data from GitHub Gists.

```typescript
import { fetchDonationData, fetchAnnouncementData } from 'discrub-core/github-service';

const donations = await fetchDonationData();
const announcement = await fetchAnnouncementData();
```

#### `export-data-service`
Paginates messages into export pages with thread separation support.

```typescript
import { prepareExportData } from 'discrub-core/export-data-service';

const result = prepareExportData(messages, config);
// result.pages — paginated message arrays
// result.threadExports — separated thread content
```

### Message Pipeline (`messages`)

The core retrieval and enrichment pipeline, composed of specialized services:

```
MessageRetrievalService (orchestrator)
  ├─ MessageFetchService      — Search API pagination, thread discovery
  ├─ ReactionEnrichmentService — Fetch reaction user data per emoji
  └─ UserDataEnrichmentService — Fetch display names, nicknames, avatars
```

All services extend `BaseServiceConfig`:
```typescript
interface BaseServiceConfig {
  apiClient: IDiscordAPIClient;
  token: string;
  onProgress?: ProgressCallback;
  onStatus?: StatusCallback;
  shouldStop?: ShouldStopCallback;
}
```

#### Modification Services

- **MessageModificationService** — Edit and delete messages
- **ReactionModificationService** — Remove reactions
- **PurgeService** — Bulk message deletion and reaction removal with user targeting

### Types

#### `types/discord-types`
Full Discord API type definitions: Message, Channel, Guild, User, Reaction, Embed, Attachment, etc.

```typescript
import type { Message, Channel, Guild, User } from 'discrub-core/types/discord-types';
```

#### `types/discrub-types`
Discrub-specific types for export, settings, and enrichment:

```typescript
import type {
  Donation,
  ExportReaction,
  ExportReactionMap,
  ExportUserMap,
  SearchCriteria,
  AppSettings,
} from 'discrub-core/types/discrub-types';
```

### Enums

```typescript
import { ChannelType, MessageType, ReactionType } from 'discrub-core/discord-enum';
import { DiscrubSetting, ExportType } from 'discrub-core/discrub-enum';
import { SortDirection } from 'discrub-core/common-enum';
```

Key enums:
- **ChannelType** — GUILD_TEXT, DM, GUILD_VOICE, GUILD_FORUM, etc.
- **DiscrubSetting** — All persisted settings keys (delays, export prefs, purge config)
- **ExportType** — HTML, CSV, JSON, MEDIA

### Utils

#### `html-formatting-utils`
Converts Discord markdown to HTML: bold, italic, code blocks, mentions, headings, links, spoilers, emojis.

```typescript
import { formatContentAsHtml } from 'discrub-core/html-formatting-utils';

const html = formatContentAsHtml(message.content, formattingContext);
```

#### `discrub-utils`
General utilities: sorting, thread management, user formatting, permission checks, date helpers.

#### `settings-utils`
Typed accessors for string-based settings:

```typescript
import { SettingsHelper } from 'discrub-core/utils/settings-utils';

const isEnabled = SettingsHelper.isEnabled(settings, DiscrubSetting.REACTIONS_ENABLED);
const delay = SettingsHelper.getNumber(settings, DiscrubSetting.SEARCH_DELAY, 2);
```

#### `export-utils`
Export-specific utilities: mention replacement, emoji HTML conversion.

#### `message-formatting-utils`
Discord message parsing: extract mentions, parse special formatting.

### Filtering

```typescript
import { updateFilters } from 'discrub-core/filtering';

const newFilters = updateFilters(currentFilters, newFilter);
```

Supports: text, date, toggle, array, and thread filter types.

### Guards

```typescript
import { isMessage, isGuild, isAttachment } from 'discrub-core/discrub-guards';
import { isNonNullable } from 'discrub-core/common-guards';
```

## Configuration

Services are configured via settings objects. All settings are stored as strings (for localStorage/chrome.storage compatibility):

| Setting | Description | Default |
|---------|-------------|---------|
| `SEARCH_DELAY` | Seconds between search API calls | `"2"` |
| `DELETE_DELAY` | Seconds between delete operations | `"1"` |
| `DELAY_MODIFIER` | Random delay variance (seconds) | `"0.5"` |
| `REACTIONS_ENABLED` | Fetch reaction user data during export | `"true"` |
| `DISPLAY_NAME_LOOKUP` | Fetch display names for users | `"false"` |
| `SERVER_NICKNAME_LOOKUP` | Fetch server nicknames | `"false"` |

## Development

```bash
# Install dependencies
npm install

# Run tests (846 tests)
npm test

# Build
npx vite build

# Lint
npm run lint
```

## Dependencies

- **date-fns** — Date formatting and manipulation
- **highlight.js** — Code block syntax highlighting in HTML exports
- **filenamify** — Safe filesystem name generation
- **nanoid** — Unique ID generation
- **copy-to-clipboard** — Clipboard utilities

## License

All rights reserved. © 2024-2026 prathercc. See [LICENSE](./LICENSE).

The source code in this repository is publicly visible for transparency and
security review. discrub-core is published to npm to support Discrub's build
pipeline; it is not licensed for use by other parties without explicit
permission from the copyright holder.

"Discrub" and the Discrub logo are trademarks of prathercc.
