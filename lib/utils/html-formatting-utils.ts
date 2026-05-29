import hljs from 'highlight.js';
import { MessageRegex } from '../regex/index.ts';
import { parseSpecialFormatting } from './message-formatting-utils.ts';
import type { HtmlFormattingContext, EmbedRenderOptions } from '../types/html-formatting-types.ts';
import type { Embed } from '../types/discord-types.ts';

/**
 * Escape HTML special characters to prevent XSS
 */
const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
};

/**
 * Render bold text as HTML
 */
export const renderBoldHtml = (text: string): string => {
  return `<strong>${text}</strong>`;
};

/**
 * Render italic text as HTML
 */
export const renderItalicHtml = (text: string): string => {
  return `<em>${text}</em>`;
};

/**
 * Render underline text as HTML
 */
export const renderUnderlineHtml = (text: string): string => {
  return `<u>${text}</u>`;
};

/**
 * Render strikethrough text as HTML
 */
export const renderStrikethroughHtml = (text: string): string => {
  return `<del>${text}</del>`;
};

/**
 * Render spoiler text as HTML with click-to-reveal functionality
 */
export const renderSpoilerHtml = (text: string): string => {
  return `<span class="spoiler" onclick="this.classList.toggle('spoiler-revealed')">${text}</span>`;
};

/**
 * Render inline code as HTML
 */
export const renderInlineCodeHtml = (text: string): string => {
  return `<code class="inline-code">${escapeHtml(text)}</code>`;
};

/**
 * Render code block as HTML with syntax highlighting
 */
export const renderCodeBlockHtml = (code: string, lang?: string): string => {
  let highlightedCode: string;

  if (lang) {
    try {
      highlightedCode = hljs.highlight(code, { language: lang }).value;
    } catch {
      // If language not found, use auto-detection
      highlightedCode = hljs.highlightAuto(code).value;
    }
  } else {
    highlightedCode = hljs.highlightAuto(code).value;
  }

  return `<pre class="code-block"><code>${highlightedCode}</code></pre>`;
};

/**
 * Render user mention as HTML
 */
export const renderUserMentionHtml = (userId: string, name: string): string => {
  return `<span class="user-mention" data-user-id="${userId}">@${escapeHtml(name)}</span>`;
};

/**
 * Render channel mention as HTML
 */
export const renderChannelMentionHtml = (channelId: string, name: string): string => {
  return `<span class="channel-mention" data-channel-id="${channelId}"># ${escapeHtml(name)}</span>`;
};

/**
 * Render heading as HTML (# ## ###)
 */
export const renderHeadingHtml = (level: number, text: string): string => {
  const tag = `h${Math.min(level, 3)}`;
  return `<${tag} class="discord-heading">${text}</${tag}>`;
};

/**
 * Render hyperlink as HTML
 */
export const renderHyperlinkHtml = (url: string): string => {
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`;
};

/**
 * Render markdown link as HTML
 */
export const renderLinkHtml = (url: string, text: string, title?: string): string => {
  const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"${titleAttr}>${escapeHtml(text)}</a>`;
};

/**
 * Convert Discord markdown and formatting to HTML.
 *
 * Pipeline shape: phase 1 stashes every pattern that depends on literal `<`
 * (Discord pseudo-tags) or that produces self-contained HTML (code blocks,
 * inline code) into a placeholder table while the content is still raw.
 * Phase 2 HTML-escapes the remaining user text — this is the safety step
 * that closes #198 (raw `<div>` in user content used to cascade through
 * the export). Phase 3 processes markdown patterns that don't depend on
 * `<` (headings, links, bold, etc.) against the now-escaped content.
 * Phase 4 restores placeholders. Placeholders use NUL-bracketed ASCII
 * tokens that survive both HTML escape and every markdown regex.
 *
 * @param content Raw message content with Discord markdown
 * @param context Context containing userMap, channelMap, emojiMap, etc.
 * @returns Formatted HTML string
 */
export const formatContentAsHtml = (
  content: string,
  context: HtmlFormattingContext
): string => {
  if (!content) return '';

  const { userMap, channelMap, guildRoles = [], emojiMap, sanitizedName } = context;

  const stash: string[] = [];
  const stashHtml = (rendered: string): string => {
    const key = `\x00DCPH${stash.length}\x00`;
    stash.push(rendered);
    return key;
  };

  let html = content;

  // ---- Phase 1: stash patterns operating on RAW (unescaped) content. ----

  // Code blocks ```...``` — hljs already escapes the code body.
  const codeMatches = Array.from(html.matchAll(MessageRegex.CODE));
  codeMatches.forEach(({ 0: codeRef, groups }) => {
    const codeText = groups?.text?.replaceAll('```', '') || '';
    const lines = codeText.split('\n');
    const firstLine = lines[0]?.trim() || '';
    const possibleLang = firstLine.length < 20 && !firstLine.includes(' ') ? firstLine : undefined;
    const actualCode = possibleLang ? lines.slice(1).join('\n') : codeText;
    html = html.replaceAll(codeRef, stashHtml(renderCodeBlockHtml(actualCode, possibleLang)));
  });

  // Auto-link URLs <https://...> (literal `<`).
  const autoLinkMatches = Array.from(html.matchAll(MessageRegex.AUTO_LINK));
  autoLinkMatches.forEach(({ 0: autoLinkRef, groups }) => {
    const url = groups?.url || '';
    html = html.replaceAll(autoLinkRef, stashHtml(renderHyperlinkHtml(url)));
  });

  // Custom emojis <:name:id> and <a:name:id> (literal `<`).
  // Inlined here so each match gets its own stash placeholder rather than
  // running convertEmojisToHtml in bulk and then trying to find the <img>
  // tags after the fact.
  const emojiRegex = /<(a)?:(\w+):(\d+)>/g;
  const emojiMatches = Array.from(html.matchAll(emojiRegex));
  emojiMatches.forEach((match) => {
    const matchRef = match[0];
    const animated = match[1];
    const name = match[2];
    const id = match[3];
    const localPath = emojiMap?.[id];
    let imgSrc: string;
    if (localPath && sanitizedName) {
      imgSrc = localPath.replace(`${sanitizedName}/`, '');
    } else {
      const animatedParam = animated ? '?animated=true' : '';
      imgSrc = `https://cdn.discordapp.com/emojis/${id}.webp${animatedParam}`;
    }
    const emojiHtml = `<img class="emoji" src="${imgSrc}" alt=":${name}:" title=":${name}:">`;
    html = html.replaceAll(matchRef, stashHtml(emojiHtml));
  });

  // User mentions <@id>, <@!id>, <@&id> (literal `<`).
  const userMentionMatches = Array.from(html.matchAll(MessageRegex.USER_MENTION));
  userMentionMatches.forEach(({ 0: ref, groups }) => {
    const id = groups?.user_id || '';
    const user = userMap[id];
    const displayName = user?.displayName || user?.userName || 'Unknown User';
    html = html.replaceAll(ref, stashHtml(renderUserMentionHtml(id, displayName)));
  });

  // Channel mentions <#id> (literal `<`).
  const channelMatches = Array.from(html.matchAll(MessageRegex.CHANNEL_MENTION));
  channelMatches.forEach(({ 0: ref, groups }) => {
    const id = groups?.channel_id || '';
    const channelName = channelMap?.[id]?.name || 'unknown-channel';
    html = html.replaceAll(ref, stashHtml(renderChannelMentionHtml(id, channelName)));
  });

  // Inline code `text` — renderInlineCodeHtml escapes internally, so we
  // stash now (before phase 2 would double-escape).
  const { quote } = parseSpecialFormatting(html, { userMap, guildRoles });
  quote.forEach((quoteRef) => {
    html = html.replaceAll(quoteRef.raw, stashHtml(renderInlineCodeHtml(quoteRef.text)));
  });

  // ---- Phase 2: HTML-escape remaining user text. ----
  // Placeholders contain only NUL chars and ASCII letters/digits — they
  // pass through unchanged. Markdown markers (`**`, `_`, `~`, `|`, `#`,
  // backticks) also pass through unchanged.
  html = html.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return map[char];
  });

  // ---- Phase 3: markdown patterns that don't depend on literal `<`. ----
  // Inputs at this point are already HTML-escaped, so the inline renderers
  // here MUST NOT re-escape — that would double-escape `&amp;` into
  // `&amp;amp;`. Headings/bold/italic/etc. already pass text through raw.
  // Link renderers do escape internally, so we open-code the link emission
  // here against the already-escaped strings.

  // Headings (# ## ###)
  const headingMatches = Array.from(html.matchAll(MessageRegex.HEADING));
  headingMatches.forEach(({ 0: headingRef, groups }) => {
    const level = (groups?.hashes || '#').length;
    const text = groups?.text || '';
    html = html.replaceAll(headingRef, renderHeadingHtml(level, text));
  });

  // Markdown links [text](url)
  const { link } = parseSpecialFormatting(html, { userMap, guildRoles });
  link.forEach((linkRef) => {
    const titleAttr = linkRef.description ? ` title="${linkRef.description}"` : '';
    const linkHtml = `<a href="${linkRef.url}" target="_blank" rel="noopener noreferrer"${titleAttr}>${linkRef.text}</a>`;
    html = html.replaceAll(linkRef.raw, linkHtml);
  });

  // Plain hyperlinks http(s)://
  const { hyperLink } = parseSpecialFormatting(html, { userMap, guildRoles });
  hyperLink.forEach((hyperLinkRef) => {
    const url = hyperLinkRef.raw;
    const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    html = html.replaceAll(hyperLinkRef.raw, linkHtml);
  });

  // Bold **text**
  const { bold } = parseSpecialFormatting(html, { userMap, guildRoles });
  bold.forEach((boldRef) => {
    html = html.replaceAll(boldRef.raw, renderBoldHtml(boldRef.text));
  });

  // Italic _text_ or *text*
  const { italics } = parseSpecialFormatting(html, { userMap, guildRoles });
  italics.forEach((italicRef) => {
    html = html.replaceAll(italicRef.raw, renderItalicHtml(italicRef.text));
  });

  // Underline __text__
  const { underLine } = parseSpecialFormatting(html, { userMap, guildRoles });
  underLine.forEach((underLineRef) => {
    html = html.replaceAll(underLineRef.raw, renderUnderlineHtml(underLineRef.text));
  });

  // Strikethrough ~~text~~
  const strikethroughMatches = Array.from(html.matchAll(MessageRegex.STRIKETHROUGH));
  strikethroughMatches.forEach(({ 0: strikeRef, groups }) => {
    const text = groups?.text || '';
    html = html.replaceAll(strikeRef, renderStrikethroughHtml(text));
  });

  // Spoilers ||text||
  const spoilerMatches = Array.from(html.matchAll(MessageRegex.SPOILER));
  spoilerMatches.forEach(({ 0: spoilerRef, groups }) => {
    const text = groups?.text || '';
    html = html.replaceAll(spoilerRef, renderSpoilerHtml(text));
  });

  // ---- Phase 4: restore phase-1 stashed HTML. ----
  for (let i = 0; i < stash.length; i++) {
    html = html.replaceAll(`\x00DCPH${i}\x00`, stash[i]);
  }

  return html;
};

/**
 * Convert color integer to hex string
 */
const colorToHex = (color?: number): string => {
  if (!color) return '#7289da'; // Default blurple
  return `#${color.toString(16).padStart(6, '0')}`;
};

/**
 * Render a Discord embed as HTML
 *
 * @param embed Discord embed object
 * @param options Render options (includeImages, includeVideos)
 * @returns Complete HTML string for the embed
 */
export const renderEmbedAsHtml = (
  embed: Embed,
  options: EmbedRenderOptions = {}
): string => {
  const { includeImages = true, includeVideos = true, mediaMap } = options;
  const colorHex = colorToHex(embed.color);

  // Rewrite a remote URL to its local path when the archive download service
  // has captured it. No map → remote URL. Map miss → remote URL (graceful
  // degrade; the HTML still renders, just won't work offline for that item).
  const resolveMedia = (url: string): string =>
    mediaMap?.[url] ?? url;

  let embedHtml = `<div class="embed" style="border-left: 4px solid ${colorHex}">`;

  // Author section
  if (embed.author) {
    embedHtml += '<div class="embed-author">';
    if (embed.author.icon_url) {
      embedHtml += `<img class="embed-author-icon" src="${escapeHtml(embed.author.icon_url)}" alt="">`;
    }
    if (embed.author.name) {
      if (embed.author.url) {
        embedHtml += `<a class="embed-author-name" href="${escapeHtml(embed.author.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(embed.author.name)}</a>`;
      } else {
        embedHtml += `<span class="embed-author-name">${escapeHtml(embed.author.name)}</span>`;
      }
    }
    embedHtml += '</div>';
  }

  // Title
  if (embed.title) {
    if (embed.url) {
      embedHtml += `<div class="embed-title"><a href="${escapeHtml(embed.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(embed.title)}</a></div>`;
    } else {
      embedHtml += `<div class="embed-title">${escapeHtml(embed.title)}</div>`;
    }
  }

  // Description
  if (embed.description) {
    embedHtml += `<div class="embed-description">${escapeHtml(embed.description)}</div>`;
  }

  // Fields
  if (embed.fields && embed.fields.length > 0) {
    embedHtml += '<div class="embed-fields">';
    embed.fields.forEach((field) => {
      const inlineClass = field.inline ? ' embed-field-inline' : '';
      embedHtml += `<div class="embed-field${inlineClass}">`;
      embedHtml += `<div class="embed-field-name">${escapeHtml(field.name)}</div>`;
      embedHtml += `<div class="embed-field-value">${escapeHtml(field.value)}</div>`;
      embedHtml += '</div>';
    });
    embedHtml += '</div>';
  }

  // Thumbnail (floats to the right)
  if (includeImages && embed.thumbnail?.url) {
    embedHtml += `<img class="embed-thumbnail" src="${escapeHtml(resolveMedia(embed.thumbnail.url))}" alt="">`;
  }

  // Image
  if (includeImages && embed.image?.url) {
    embedHtml += `<img class="embed-image" src="${escapeHtml(resolveMedia(embed.image.url))}" alt="">`;
  }

  // Video
  if (includeVideos && embed.video?.url) {
    embedHtml += `<video class="embed-video" controls src="${escapeHtml(resolveMedia(embed.video.url))}"></video>`;
  }

  // Footer
  if (embed.footer || embed.timestamp) {
    embedHtml += '<div class="embed-footer">';
    if (embed.footer?.icon_url) {
      embedHtml += `<img class="embed-footer-icon" src="${escapeHtml(embed.footer.icon_url)}" alt="">`;
    }
    if (embed.footer?.text) {
      embedHtml += `<span class="embed-footer-text">${escapeHtml(embed.footer.text)}</span>`;
    }
    if (embed.timestamp) {
      const timestamp = new Date(embed.timestamp).toLocaleString();
      embedHtml += `<span class="embed-timestamp">${escapeHtml(timestamp)}</span>`;
    }
    embedHtml += '</div>';
  }

  embedHtml += '</div>';
  return embedHtml;
};
