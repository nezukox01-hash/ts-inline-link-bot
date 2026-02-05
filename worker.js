export default {
  async fetch(request, env) {
    try {
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
      const msg =
        update.message ||
        update.edited_message ||
        update.channel_post ||
        update.edited_channel_post;

      if (!msg || !msg.chat) {
        return new Response("OK", { status: 200 });
      }

      // ================================
      // /start
      // ================================
      if (msg.text && msg.text.startsWith("/start")) {
        await sendMessage(
          env,
          msg.chat.id,
          `👋 Welcome!

✅ Bot is running successfully.

🆘 I’m Touhid, here to share tips and help.
INLINE:

⚠️ Admin Permission Required

📌 Required permissions:
• Manage messages
• Delete messages (optional but recommended)

✳️Inline command: 
@TSquicklink_bot Notes www.fb.com
@TSquicklink_bot Notes | www.fb.com

✳️AUTO TAG (Maybe delete permission Needed):
#url Notes www.fb.com
#url Notes | www.fb.com

✴️Result:
- Title bold
- Link spoiler (hidden)
- Preview OFF`
        );
        return new Response("OK", { status: 200 });
      }

      // ================================
      // #url TRIGGER (delete user message first)
      // ================================
      if (msg.text && msg.text.trim().toLowerCase().startsWith("#url")) {
        const input = msg.text.replace(/^#url\s*/i, "");
        await sendFormattedLink(env, msg.chat.id, input, msg); // delete this msg
        return new Response("OK", { status: 200 });
      }

      return new Response("OK", { status: 200 });
    } catch (e) {
      return new Response("OK", { status: 200 });
    }
  }
};

// =====================================================
// Parse title + link
// =====================================================
function parseTitleAndLink(input) {
  const s = (input || "").trim();
  if (!s) return { title: "Link", link: "" };

  // Title | link
  if (s.includes("|")) {
    const parts = s.split("|").map(p => p.trim()).filter(Boolean);
    return {
      title: parts[0] || "Link",
      link: normalizeLink(parts[1] || "")
    };
  }

  // Auto detect link token
  const tokens = s.split(/\s+/);
  let linkIndex = -1;

  for (let i = 0; i < tokens.length; i++) {
    if (looksLikeLink(tokens[i])) {
      linkIndex = i;
      break;
    }
  }

  if (linkIndex === -1) return { title: s, link: "" };

  return {
    title: tokens.slice(0, linkIndex).join(" ").trim() || "Link",
    link: normalizeLink(tokens[linkIndex])
  };
}

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

function normalizeLink(raw) {
  const x = (raw || "").trim();
  if (!x) return "";
  if (x.startsWith("http://") || x.startsWith("https://")) return x;
  return "https://" + x;
}

// =====================================================
// INLINE HANDLER
// =====================================================
async function handleInline(inlineQuery, env) {
  const q = (inlineQuery.query || "").trim();
  const { title, link } = parseTitleAndLink(q);

  let results = [];

  if (!link) {
    results.push({
      type: "article",
      id: "help",
      title: "Type: Title <space> Link",
      description: "Example: Notes www.fb.com ",
      input_message_content: {
        message_text: `✅ Examples:

INLINE:
@TSquicklink_bot Notes www.fb.com
@TSquicklink_bot Notes | www.fb.com

AUTO:
#url Notes www.fb.com`,
        disable_web_page_preview: true
      }
    });
  } else {
    const visible = `${title}\n`;
    const full = visible + link;

    results.push({
      type: "article",
      id: "link",
      title,
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
// Send formatted link
// If originalMsg is provided -> delete user's message first
// =====================================================
async function sendFormattedLink(env, chatId, input, originalMsg) {
  const { title, link } = parseTitleAndLink(input);

  if (!link) {
    await sendMessage(
      env,
      chatId,
      `❌ Link missing.

Examples:
#url Notes www.fb.com`
    );
    return;
  }

  // ✅ Delete user's message (ONLY if provided)
  if (originalMsg) {
    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/deleteMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: originalMsg.chat.id,
        message_id: originalMsg.message_id
      })
    });
  }

  const visible = `${title}\n`;
  const full = visible + link;

  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: full,
      disable_web_page_preview: true,
      entities: [
        { type: "bold", offset: 0, length: title.length },
        { type: "spoiler", offset: visible.length, length: link.length }
      ]
    })
  });
}

// =====================================================
// Helper: send normal text
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
