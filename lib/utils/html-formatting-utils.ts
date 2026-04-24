import hljs from 'highlight.js';
import { MessageRegex } from '../regex/index.ts';
import { parseSpecialFormatting } from './message-formatting-utils.ts';
import { convertEmojisToHtml } from './export-utils.ts';
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
 * Convert Discord markdown and formatting to HTML
 * Processing order is critical to avoid nested formatting issues
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

  let html = content;
  const { userMap, channelMap, guildRoles = [], emojiMap, sanitizedName } = context;

  // Step 1: Custom emojis (must be first to avoid conflicts)
  html = convertEmojisToHtml(html, emojiMap, sanitizedName);

  // Step 2: Code blocks (must be early to preserve code content)
  const codeMatches = Array.from(html.matchAll(MessageRegex.CODE));
  codeMatches.forEach(({ 0: codeRef, groups }) => {
    const codeText = groups?.text?.replaceAll('```', '') || '';
    // Try to detect language from first line
    const lines = codeText.split('\n');
    const firstLine = lines[0]?.trim() || '';
    const possibleLang = firstLine.length < 20 && !firstLine.includes(' ') ? firstLine : undefined;
    const actualCode = possibleLang ? lines.slice(1).join('\n') : codeText;

    html = html.replaceAll(codeRef, renderCodeBlockHtml(actualCode, possibleLang));
  });

  // Step 3: Headings (# ## ### at start of line)
  const headingMatches = Array.from(html.matchAll(MessageRegex.HEADING));
  headingMatches.forEach(({ 0: headingRef, groups }) => {
    const level = (groups?.hashes || '#').length;
    const text = groups?.text || '';
    html = html.replaceAll(headingRef, renderHeadingHtml(level, text));
  });

  // Step 4: Auto-linked URLs <https://...> (Discord angle-bracket links)
  const autoLinkMatches = Array.from(html.matchAll(MessageRegex.AUTO_LINK));
  autoLinkMatches.forEach(({ 0: autoLinkRef, groups }) => {
    const url = groups?.url || '';
    html = html.replaceAll(autoLinkRef, renderHyperlinkHtml(url));
  });

  // Step 5: Links [text](url)
  const { link } = parseSpecialFormatting(html, { userMap, guildRoles });
  link.forEach((linkRef) => {
    html = html.replaceAll(
      linkRef.raw,
      renderLinkHtml(linkRef.url, linkRef.text, linkRef.description)
    );
  });

  // Step 6: Hyperlinks http://
  const { hyperLink } = parseSpecialFormatting(html, { userMap, guildRoles });
  hyperLink.forEach((hyperLinkRef) => {
    html = html.replaceAll(hyperLinkRef.raw, renderHyperlinkHtml(hyperLinkRef.raw));
  });

  // Step 7: Bold **text**
  const { bold } = parseSpecialFormatting(html, { userMap, guildRoles });
  bold.forEach((boldRef) => {
    html = html.replaceAll(boldRef.raw, renderBoldHtml(boldRef.text));
  });

  // Step 8: Italic _text_ or *text*
  const { italics } = parseSpecialFormatting(html, { userMap, guildRoles });
  italics.forEach((italicRef) => {
    html = html.replaceAll(italicRef.raw, renderItalicHtml(italicRef.text));
  });

  // Step 9: Underline __text__
  const { underLine } = parseSpecialFormatting(html, { userMap, guildRoles });
  underLine.forEach((underLineRef) => {
    html = html.replaceAll(underLineRef.raw, renderUnderlineHtml(underLineRef.text));
  });

  // Step 10: Strikethrough ~~text~~
  const strikethroughMatches = Array.from(html.matchAll(MessageRegex.STRIKETHROUGH));
  strikethroughMatches.forEach(({ 0: strikeRef, groups }) => {
    const text = groups?.text || '';
    html = html.replaceAll(strikeRef, renderStrikethroughHtml(text));
  });

  // Step 11: Spoilers ||text||
  const spoilerMatches = Array.from(html.matchAll(MessageRegex.SPOILER));
  spoilerMatches.forEach(({ 0: spoilerRef, groups }) => {
    const text = groups?.text || '';
    html = html.replaceAll(spoilerRef, renderSpoilerHtml(text));
  });

  // Step 12: Inline code `text`
  const { quote } = parseSpecialFormatting(html, { userMap, guildRoles });
  quote.forEach((quoteRef) => {
    html = html.replaceAll(quoteRef.raw, renderInlineCodeHtml(quoteRef.text));
  });

  // Step 13: Channel mentions <#id>
  const { channel } = parseSpecialFormatting(html, { userMap, guildRoles });
  channel.forEach((channelRef) => {
    const channelName = channelMap?.[channelRef.channelId || '']?.name || 'unknown-channel';
    html = html.replaceAll(channelRef.raw, renderChannelMentionHtml(channelRef.channelId || '', channelName));
  });

  // Step 14: User mentions <@id>
  const { userMention } = parseSpecialFormatting(html, { userMap, guildRoles });
  userMention.forEach((userMentionRef) => {
    const user = userMap[userMentionRef.id];
    const displayName = user?.displayName || user?.userName || 'Unknown User';
    html = html.replaceAll(userMentionRef.raw, renderUserMentionHtml(userMentionRef.id, displayName));
  });

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
