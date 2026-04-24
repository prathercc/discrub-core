import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  renderBoldHtml,
  renderItalicHtml,
  renderUnderlineHtml,
  renderStrikethroughHtml,
  renderSpoilerHtml,
  renderInlineCodeHtml,
  renderCodeBlockHtml,
  renderUserMentionHtml,
  renderChannelMentionHtml,
  renderHyperlinkHtml,
  renderLinkHtml,
  formatContentAsHtml,
  renderEmbedAsHtml,
} from './html-formatting-utils.ts';
import type { Embed } from '../types/discord-types.ts';
import { EmbedType } from '../enum/discord-enum.ts';

// Mock highlight.js
vi.mock('highlight.js', () => ({
  default: {
    highlight: vi.fn((code: string) => ({ value: `<highlighted>${code}</highlighted>` })),
    highlightAuto: vi.fn((code: string) => ({ value: `<auto-highlighted>${code}</auto-highlighted>` })),
  },
}));

describe('html-formatting-utils', () => {
  describe('Basic Formatting Renderers', () => {
    it('should render bold HTML', () => {
      const result = renderBoldHtml('bold text');
      expect(result).toBe('<strong>bold text</strong>');
    });

    it('should render italic HTML', () => {
      const result = renderItalicHtml('italic text');
      expect(result).toBe('<em>italic text</em>');
    });

    it('should render underline HTML', () => {
      const result = renderUnderlineHtml('underlined text');
      expect(result).toBe('<u>underlined text</u>');
    });

    it('should render strikethrough HTML', () => {
      const result = renderStrikethroughHtml('strikethrough text');
      expect(result).toBe('<del>strikethrough text</del>');
    });

    it('should render spoiler HTML with click handler', () => {
      const result = renderSpoilerHtml('spoiler text');
      expect(result).toContain('<span class="spoiler"');
      expect(result).toContain('onclick');
      expect(result).toContain('spoiler text');
    });
  });

  describe('Code Rendering', () => {
    it('should render inline code with HTML escaping', () => {
      const result = renderInlineCodeHtml('const x = 1;');
      expect(result).toBe('<code class="inline-code">const x = 1;</code>');
    });

    it('should escape HTML in inline code', () => {
      const result = renderInlineCodeHtml('<script>alert("xss")</script>');
      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('&lt;/script&gt;');
      expect(result).not.toContain('<script>');
    });

    it('should render code block with language', () => {
      const result = renderCodeBlockHtml('const x = 1;', 'javascript');
      expect(result).toContain('<pre class="code-block">');
      expect(result).toContain('<code>');
      expect(result).toContain('</code></pre>');
    });

    it('should render code block without language', () => {
      const result = renderCodeBlockHtml('const x = 1;');
      expect(result).toContain('<pre class="code-block">');
      expect(result).toContain('<code>');
    });

    it('should handle invalid language gracefully', () => {
      const result = renderCodeBlockHtml('some code', 'invalid-language');
      expect(result).toContain('<pre class="code-block">');
      expect(result).toContain('<code>');
    });
  });

  describe('Mention Rendering', () => {
    it('should render user mention', () => {
      const result = renderUserMentionHtml('123', 'alice');
      expect(result).toBe('<span class="user-mention" data-user-id="123">@alice</span>');
    });

    it('should escape HTML in user mention name', () => {
      const result = renderUserMentionHtml('123', '<script>alert("xss")</script>');
      expect(result).toContain('&lt;script&gt;');
      expect(result).not.toContain('<script>');
    });

    it('should render channel mention', () => {
      const result = renderChannelMentionHtml('456', 'general');
      expect(result).toBe('<span class="channel-mention" data-channel-id="456"># general</span>');
    });

    it('should escape HTML in channel mention name', () => {
      const result = renderChannelMentionHtml('456', '<img src=x onerror=alert(1)>');
      expect(result).toContain('&lt;img');
      expect(result).not.toContain('<img');
    });
  });

  describe('Link Rendering', () => {
    it('should render hyperlink with security attributes', () => {
      const result = renderHyperlinkHtml('https://example.com');
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
    });

    it('should escape HTML in hyperlink URL', () => {
      const result = renderHyperlinkHtml('https://example.com?param=<script>');
      expect(result).toContain('&lt;script&gt;');
      expect(result).not.toContain('<script>');
    });

    it('should render markdown link', () => {
      const result = renderLinkHtml('https://example.com', 'Click here');
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('>Click here</a>');
      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
    });

    it('should render markdown link with title', () => {
      const result = renderLinkHtml('https://example.com', 'Click here', 'A website');
      expect(result).toContain('title="A website"');
    });

    it('should escape HTML in markdown link', () => {
      const result = renderLinkHtml('https://example.com', '<script>xss</script>', '<script>');
      expect(result).toContain('&lt;script&gt;');
      expect(result).not.toContain('<script>xss</script>');
    });
  });

  describe('formatContentAsHtml', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should handle empty content', () => {
      const result = formatContentAsHtml('', {
        userMap: {},
        channelMap: {},
      });
      expect(result).toBe('');
    });

    it('should handle plain text', () => {
      const result = formatContentAsHtml('Hello world', {
        userMap: {},
        channelMap: {},
      });
      expect(result).toBe('Hello world');
    });

    it('should format bold text', () => {
      const result = formatContentAsHtml('This is **bold** text', {
        userMap: {},
        channelMap: {},
      });
      expect(result).toContain('<strong>bold</strong>');
    });

    it('should format italic text', () => {
      const result = formatContentAsHtml('This is _italic_ text', {
        userMap: {},
        channelMap: {},
      });
      expect(result).toContain('<em>italic</em>');
    });

    it('should format underlined text', () => {
      const result = formatContentAsHtml('This is __underlined__ text', {
        userMap: {},
        channelMap: {},
      });
      expect(result).toContain('<u>underlined</u>');
    });

    it('should format strikethrough text', () => {
      const result = formatContentAsHtml('This is ~~crossed~~ text', {
        userMap: {},
        channelMap: {},
      });
      expect(result).toContain('<del>crossed</del>');
    });

    it('should format spoiler text', () => {
      const result = formatContentAsHtml('This is ||spoiler|| text', {
        userMap: {},
        channelMap: {},
      });
      expect(result).toContain('<span class="spoiler"');
      expect(result).toContain('spoiler');
    });

    it('should format inline code', () => {
      const result = formatContentAsHtml('Use `console.log()` here', {
        userMap: {},
        channelMap: {},
      });
      expect(result).toContain('<code class="inline-code">console.log()</code>');
    });

    it('should format code blocks', () => {
      const result = formatContentAsHtml('```javascript\nconst x = 1;```', {
        userMap: {},
        channelMap: {},
      });
      expect(result).toContain('<pre class="code-block">');
      expect(result).toContain('<code>');
    });

    it('should format hyperlinks', () => {
      const result = formatContentAsHtml('Visit https://example.com now', {
        userMap: {},
        channelMap: {},
      });
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('target="_blank"');
    });

    it('should format markdown links', () => {
      const result = formatContentAsHtml('[Click here](https://example.com)', {
        userMap: {},
        channelMap: {},
      });
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('>Click here</a>');
    });

    it('should format user mentions', () => {
      const result = formatContentAsHtml('Hello <@123>', {
        userMap: {
          '123': { userName: 'alice', displayName: 'Alice' },
        },
        channelMap: {},
      });
      expect(result).toContain('<span class="user-mention"');
      expect(result).toContain('data-user-id="123"');
      expect(result).toContain('@Alice');
    });

    it('should format channel mentions', () => {
      const result = formatContentAsHtml('Check <#456>', {
        userMap: {},
        channelMap: {
          '456': { id: '456', name: 'general' },
        },
      });
      expect(result).toContain('<span class="channel-mention"');
      expect(result).toContain('data-channel-id="456"');
      expect(result).toContain('# general');
    });

    it('should handle unknown channel', () => {
      const result = formatContentAsHtml('Check <#999>', {
        userMap: {},
        channelMap: {},
      });
      expect(result).toContain('unknown-channel');
    });

    it('should handle multiple formatting types', () => {
      const result = formatContentAsHtml('**Bold** and _italic_ text', {
        userMap: {},
        channelMap: {},
      });
      expect(result).toContain('<strong>Bold</strong>');
      expect(result).toContain('<em>italic</em>');
    });
  });

  describe('renderEmbedAsHtml', () => {
    it('should render minimal embed', () => {
      const embed: Embed = {
        type: EmbedType.RICH,
      };

      const result = renderEmbedAsHtml(embed);

      expect(result).toContain('<div class="embed"');
      expect(result).toContain('</div>');
    });

    it('should render embed with title', () => {
      const embed: Embed = {
        type: EmbedType.RICH,
        title: 'Test Title',
      };

      const result = renderEmbedAsHtml(embed);

      expect(result).toContain('class="embed-title"');
      expect(result).toContain('Test Title');
    });

    it('should render embed with clickable title', () => {
      const embed: Embed = {
        type: EmbedType.RICH,
        title: 'Test Title',
        url: 'https://example.com',
      };

      const result = renderEmbedAsHtml(embed);

      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('Test Title');
    });

    it('should render embed with description', () => {
      const embed: Embed = {
        type: EmbedType.RICH,
        description: 'Test description',
      };

      const result = renderEmbedAsHtml(embed);

      expect(result).toContain('class="embed-description"');
      expect(result).toContain('Test description');
    });

    it('should render embed with author', () => {
      const embed: Embed = {
        type: EmbedType.RICH,
        author: {
          name: 'Author Name',
          icon_url: 'https://example.com/icon.png',
        },
      };

      const result = renderEmbedAsHtml(embed);

      expect(result).toContain('class="embed-author"');
      expect(result).toContain('Author Name');
      expect(result).toContain('src="https://example.com/icon.png"');
    });

    it('should render embed with clickable author', () => {
      const embed: Embed = {
        type: EmbedType.RICH,
        author: {
          name: 'Author Name',
          url: 'https://author.com',
        },
      };

      const result = renderEmbedAsHtml(embed);

      expect(result).toContain('href="https://author.com"');
      expect(result).toContain('Author Name');
    });

    it('should render embed with fields', () => {
      const embed: Embed = {
        type: EmbedType.RICH,
        fields: [
          { name: 'Field 1', value: 'Value 1' },
          { name: 'Field 2', value: 'Value 2', inline: true },
        ],
      };

      const result = renderEmbedAsHtml(embed);

      expect(result).toContain('class="embed-fields"');
      expect(result).toContain('Field 1');
      expect(result).toContain('Value 1');
      expect(result).toContain('Field 2');
      expect(result).toContain('embed-field-inline');
    });

    it('should render embed with thumbnail', () => {
      const embed: Embed = {
        type: EmbedType.RICH,
        thumbnail: {
          url: 'https://example.com/thumb.png',
        },
      };

      const result = renderEmbedAsHtml(embed);

      expect(result).toContain('class="embed-thumbnail"');
      expect(result).toContain('src="https://example.com/thumb.png"');
    });

    it('should render embed with image', () => {
      const embed: Embed = {
        type: EmbedType.RICH,
        image: {
          url: 'https://example.com/image.png',
        },
      };

      const result = renderEmbedAsHtml(embed);

      expect(result).toContain('class="embed-image"');
      expect(result).toContain('src="https://example.com/image.png"');
    });

    it('should render embed with video', () => {
      const embed: Embed = {
        type: EmbedType.RICH,
        video: {
          url: 'https://example.com/video.mp4',
        },
      };

      const result = renderEmbedAsHtml(embed);

      expect(result).toContain('class="embed-video"');
      expect(result).toContain('src="https://example.com/video.mp4"');
      expect(result).toContain('<video');
    });

    it('should rewrite image/video/thumbnail URLs through mediaMap when provided', () => {
      const embed: Embed = {
        type: EmbedType.RICH,
        thumbnail: { url: 'https://media.tenor.com/abc/thumb.png' },
        image: { url: 'https://media.tenor.com/abc/image.png' },
        video: { url: 'https://media.tenor.com/abc/video.mp4' },
      };

      const result = renderEmbedAsHtml(embed, {
        mediaMap: {
          'https://media.tenor.com/abc/thumb.png': 'media/embed-thumbnails/1_1.png',
          'https://media.tenor.com/abc/image.png': 'media/embed-images/1_1.png',
          'https://media.tenor.com/abc/video.mp4': 'media/embed-videos/1_1.mp4',
        },
      });

      expect(result).toContain('src="media/embed-thumbnails/1_1.png"');
      expect(result).toContain('src="media/embed-images/1_1.png"');
      expect(result).toContain('src="media/embed-videos/1_1.mp4"');
      expect(result).not.toContain('https://media.tenor.com/');
    });

    it('should fall back to remote URL when mediaMap lookup misses', () => {
      const embed: Embed = {
        type: EmbedType.RICH,
        thumbnail: { url: 'https://media.tenor.com/missing/thumb.png' },
      };

      const result = renderEmbedAsHtml(embed, {
        mediaMap: {
          'https://media.tenor.com/other/thumb.png': 'media/embed-thumbnails/x.png',
        },
      });

      expect(result).toContain('src="https://media.tenor.com/missing/thumb.png"');
    });

    it('should behave identically to the no-options call when mediaMap is omitted', () => {
      const embed: Embed = {
        type: EmbedType.RICH,
        thumbnail: { url: 'https://example.com/thumb.png' },
        video: { url: 'https://example.com/video.mp4' },
      };

      const withoutOpts = renderEmbedAsHtml(embed);
      const withEmptyOpts = renderEmbedAsHtml(embed, {});

      expect(withoutOpts).toBe(withEmptyOpts);
      expect(withoutOpts).toContain('src="https://example.com/thumb.png"');
      expect(withoutOpts).toContain('src="https://example.com/video.mp4"');
    });

    it('should render embed with footer', () => {
      const embed: Embed = {
        type: EmbedType.RICH,
        footer: {
          text: 'Footer text',
          icon_url: 'https://example.com/footer-icon.png',
        },
      };

      const result = renderEmbedAsHtml(embed);

      expect(result).toContain('class="embed-footer"');
      expect(result).toContain('Footer text');
      expect(result).toContain('src="https://example.com/footer-icon.png"');
    });

    it('should render embed with timestamp', () => {
      const embed: Embed = {
        type: EmbedType.RICH,
        timestamp: '2024-01-15T12:00:00Z',
      };

      const result = renderEmbedAsHtml(embed);

      expect(result).toContain('class="embed-timestamp"');
      expect(result).toContain('2024');
    });

    it('should render embed with custom color', () => {
      const embed: Embed = {
        type: EmbedType.RICH,
        color: 16711680, // Red
      };

      const result = renderEmbedAsHtml(embed);

      expect(result).toContain('border-left: 4px solid #ff0000');
    });

    it('should use default color when not specified', () => {
      const embed: Embed = {
        type: EmbedType.RICH,
      };

      const result = renderEmbedAsHtml(embed);

      expect(result).toContain('border-left: 4px solid #7289da');
    });

    it('should respect includeImages option', () => {
      const embed: Embed = {
        type: EmbedType.RICH,
        image: {
          url: 'https://example.com/image.png',
        },
      };

      const result = renderEmbedAsHtml(embed, { includeImages: false });

      expect(result).not.toContain('class="embed-image"');
    });

    it('should respect includeVideos option', () => {
      const embed: Embed = {
        type: EmbedType.RICH,
        video: {
          url: 'https://example.com/video.mp4',
        },
      };

      const result = renderEmbedAsHtml(embed, { includeVideos: false });

      expect(result).not.toContain('class="embed-video"');
    });

    it('should escape HTML in embed content', () => {
      const embed: Embed = {
        type: EmbedType.RICH,
        title: '<script>alert("xss")</script>',
        description: '<img src=x onerror=alert(1)>',
      };

      const result = renderEmbedAsHtml(embed);

      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('&lt;img');
      expect(result).not.toContain('<script>alert');
      expect(result).not.toContain('<img src=x');
    });

    it('should render complete embed with all features', () => {
      const embed: Embed = {
        type: EmbedType.RICH,
        title: 'Full Embed',
        description: 'Complete description',
        url: 'https://example.com',
        color: 5814783,
        author: {
          name: 'Author',
          url: 'https://author.com',
          icon_url: 'https://author.com/icon.png',
        },
        thumbnail: {
          url: 'https://example.com/thumb.png',
        },
        image: {
          url: 'https://example.com/image.png',
        },
        fields: [
          { name: 'Field 1', value: 'Value 1' },
          { name: 'Field 2', value: 'Value 2', inline: true },
        ],
        footer: {
          text: 'Footer',
          icon_url: 'https://example.com/footer.png',
        },
        timestamp: '2024-01-15T12:00:00Z',
      };

      const result = renderEmbedAsHtml(embed);

      expect(result).toContain('Full Embed');
      expect(result).toContain('Complete description');
      expect(result).toContain('Author');
      expect(result).toContain('Field 1');
      expect(result).toContain('Footer');
      expect(result).toContain('embed-thumbnail');
      expect(result).toContain('embed-image');
    });
  });
});
