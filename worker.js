export default {
  async fetch(request, env) {
    try {
      // Telegram always expects HTTP 200
      if (request.method !== "POST") {
        return new Response("OK", { status: 200 });
      }

      const update = await request.json();

      // ================================
      // INLINE MODE (@botusername ...)
      // ================================
      if (update.inline_query) {
        await handleInline(update.inline_query, env);
        return new Response("OK", { status: 200 });
      }

      // Normal message updates
      const msg = update.message || update.edited_message;

      // ================================
      // /start COMMAND (health check)
      // ================================
      if (msg && msg.chat && msg.text && msg.text.startsWith("/start")) {
        await sendMessage(
          env,
          msg.chat.id,
          `👋 Welcome!

✅ Bot is running successfully.

Inline usage:
@TSquicklink_bot Notes www.fb.com

Optional old style:
@TSquicklink_bot Notes | www.fb.com

Command usage:
/link Notes www.fb.com
/link Notes | www.fb.com

Result:
- Title will be bold
- Link will be hidden (spoiler)
- Link preview is OFF`
        );
        return new Response("OK", { status: 200 });
      }

      // ================================
      // /link COMMAND
      // ================================
      if (msg && msg.chat && msg.text && msg.text.startsWith("/link")) {
        // Remove /link or /link@BotUsername
        const input = msg.text.replace(/^\/link(@\w+)?\s*/i, "");
        const { title, link } = parseTitleAndLink(input);

        if (!link) {
          await sendMessage(
            env,
            msg.chat.id,
            `❌ Please provide a link.

Examples:
/link Notes www.fb.com
/link Notes | www.fb.com`
          );
          return new Response("OK", { status: 200 });
        }

        const visible = `${title}\n`;
        const full = visible + link;

        await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: msg.chat.id,
            text: full,
            disable_web_page_preview: true,
            entities: [
              { type: "bold", offset: 0, length: title.length },
              { type: "spoiler", offset: visible.length, length: link.length }
            ]
          })
        });

        return new Response("OK", { status: 200 });
      }

      return new Response("OK", { status: 200 });
    } catch (e) {
      // Never return 500
      return new Response("OK", { status: 200 });
    }
  }
};

// ================================
// #url TRIGGER (auto mode)
// Usage:
// #url Notes www.fb.com
// #url Notes | www.fb.com
// ================================
if (msg && msg.chat && msg.text && msg.text.trim().toLowerCase().startsWith("#url")) {
  // Remove "#url" and any spaces
  const input = msg.text.replace(/^#url\s*/i, "");

  const { title, link } = parseTitleAndLink(input);

  if (!link) {
    await sendMessage(
      env,
      msg.chat.id,
      `❌ Please provide a link after #url

Examples:
#url Notes www.fb.com
#url Notes | www.fb.com`
    );
    return new Response("OK", { status: 200 });
  }

  const visible = `${title}\n`;
  const full = visible + link;

  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: msg.chat.id,
      text: full,
      disable_web_page_preview: true,
      entities: [
        { type: "bold", offset: 0, length: title.length },
        { type: "spoiler", offset: visible.length, length: link.length }
      ]
    })
  });

  return new Response("OK", { status: 200 });
}
// =====================================================
// Parse title + link from input
// Supports:
// 1) Notes www.fb.com
// 2) Notes | www.fb.com
// 3) www.fb.com
// =====================================================
function parseTitleAndLink(input) {
  const s = (input || "").trim();
  if (!s) return { title: "Link", link: "" };

  // Old style: Title | link
  if (s.includes("|")) {
    const parts = s.split("|").map(p => p.trim()).filter(Boolean);
    return {
      title: parts[0] || "Link",
      link: normalizeLink(parts[1] || "")
    };
  }

  // Auto detect link
  const tokens = s.split(/\s+/);
  let linkIndex = -1;

  for (let i = 0; i < tokens.length; i++) {
    if (looksLikeLink(tokens[i])) {
      linkIndex = i;
      break;
    }
  }

  if (linkIndex === -1) {
    return { title: s, link: "" };
  }

  return {
    title: tokens.slice(0, linkIndex).join(" ").trim() || "Link",
    link: normalizeLink(tokens[linkIndex])
  };
}

// Detect link-like words
function looksLikeLink(word) {
  if (!word) return false;
  const x = word.toLowerCase();
  return (
    x.startsWith("http://") ||
    x.startsWith("https://") ||
    x.startsWith("www.") ||
    x.includes("t.me/") ||
    x.includes(".com") ||
    x.includes(".net") ||
    x.includes(".org")
  );
}

// Ensure https://
function normalizeLink(raw) {
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return "https://" + raw;
}

// =====================================================
// INLINE HANDLER
// =====================================================
async function handleInline(inlineQuery, env) {
  const q = (inlineQuery.query || "").trim();
  const { title, link } = parseTitleAndLink(q);

  let results = [];

  // HELP CARD (when no link)
  if (!link) {
    results.push({
      type: "article",
      id: "help",
      title: "Type: Title <space> Link",
      description: "Example: Notes www.fb.com or Notes | www.fb.com",
      input_message_content: {
        message_text: `✅ Example (no need | ):
@TSquicklink_bot Notes www.fb.com

Optional old style:
@TSquicklink_bot Notes | www.fb.com

Command usage:
/link Notes www.fb.com
/link Notes | www.fb.com`,
        disable_web_page_preview: true
      }
    });
  } else {
    const visible = `${title}\n`;
    const full = visible + link;

    results.push({
      type: "article",
      id: "link",
      title: title,
      description: link,
      input_message_content: {
        message_text: full,
        disable_web_page_preview: true,
        entities: [
          { type: "bold", offset: 0, length: title.length },
          { type: "spoiler", offset: visible.length, length: link.length }
        ]
      }
    });
  }

  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/answerInlineQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inline_query_id: inlineQuery.id,
      results,
      cache_time: 1
    })
  });
}

// =====================================================
// Helper: send normal message
// =====================================================
async function sendMessage(env, chatId, text) {
  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
  });
}
