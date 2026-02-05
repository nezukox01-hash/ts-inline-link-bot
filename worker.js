export default {
  async fetch(request, env) {
    try {
      // Telegram webhooks always expect HTTP 200
      if (request.method !== "POST") {
        return new Response("OK", { status: 200 });
      }

      // Parse incoming Telegram update
      const update = await request.json();

      // ================================
      // INLINE MODE HANDLER
      // Triggered when user types:
      // @YourBotUsername ...
      // ================================
      if (update.inline_query) {
        await handleInline(update.inline_query, env);
        return new Response("OK", { status: 200 });
      }

      // ================================
      // /start COMMAND (health check)
      // Used to verify bot + deploy works
      // ================================
      const msg = update.message || update.edited_message;
      if (msg && msg.chat && msg.text && msg.text.startsWith("/start")) {
        await sendMessage(
          env,
          msg.chat.id,
          "👋 Welcome!\n\n" +
            "✅ Bot is running successfully.\n\n" +
            "Inline usage:\n" +
            "@TSquicklink_bot Notes www.fb.com\n\n" +
            "Optional old style:\n" +
            "@TSquicklink_bot Notes | www.fb.com\n\n" +
            "Result:\n" +
            "• Title will be bold\n" +
            "• Link will be hidden (spoiler)\n" +
            "• Link preview is OFF"
        );
      }

      return new Response("OK", { status: 200 });
    } catch (e) {
      // Never return 500 to Telegram
      return new Response("OK", { status: 200 });
    }
  }
};

//
// =====================================================
// FUNCTION: parseTitleAndLink
// PURPOSE:
//   Extract title and link from user inline query
//
// SUPPORTED INPUTS:
//   1) "Notes www.fb.com"
//   2) "Notes | www.fb.com"
//   3) "www.fb.com"  (auto title)
//
// RULES:
//   - If '|' exists → split by |
//   - Else → detect first link-like word
// =====================================================
//
function parseTitleAndLink(input) {
  const s = (input || "").trim();
  if (!s) return { title: "Link", link: "" };

  // ---------- Old style: Title | link ----------
  if (s.includes("|")) {
    const parts = s.split("|").map(p => p.trim()).filter(Boolean);
    const title = parts[0] || "Link";
    const link = normalizeLink(parts[1] || "");
    return { title, link };
  }

  // ---------- Auto detect link anywhere ----------
  const tokens = s.split(/\s+/);
  let linkIndex = -1;

  for (let i = 0; i < tokens.length; i++) {
    if (looksLikeLink(tokens[i])) {
      linkIndex = i;
      break;
    }
  }

  // No link found
  if (linkIndex === -1) {
    return { title: s, link: "" };
  }

  const link = normalizeLink(tokens[linkIndex]);
  const title =
    tokens.slice(0, linkIndex).join(" ").trim() || "Link";

  return { title, link };
}

//
// Check whether a word looks like a URL
//
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

//
// Ensure URL has protocol
//
function normalizeLink(raw) {
  const x = (raw || "").trim();
  if (!x) return "";
  if (x.startsWith("http://") || x.startsWith("https://")) return x;
  return "https://" + x;
}

//
// =====================================================
// INLINE HANDLER
// - Shows HELP card if link is missing
// - Shows FINAL card if link exists
// =====================================================
//
async function handleInline(inlineQuery, env) {
  const q = (inlineQuery.query || "").trim();
  const { title, link } = parseTitleAndLink(q);

  let results = [];

  // ---------- HELP RESULT ----------
  if (!link) {
    results.push({
      type: "article",
      id: "help",
      title: "TOUHID says, Type: Title then Link",
      description: "Example: Notes www.fb.com or Notes | www.fb.com",
      input_message_content: {
        message_text:
          "✅ Example (no need | ):\n" +
          "@TSquicklink_bot Notes www.fb.com\n\n" +
          "Optional old style:\n" +
          "@TSquicklink_bot Notes | www.fb.com",
        disable_web_page_preview: true
      }
    });
  } else {
    // ---------- FINAL LINK RESULT ----------
    const visibleText = title + "\n";
    const fullText = visibleText + link;

    results.push({
      type: "article",
      id: "link",
      title: title,
      description: link,
      input_message_content: {
        message_text: fullText,
        disable_web_page_preview: true,
        entities: [
          // Make title bold
          { type: "bold", offset: 0, length: title.length },
          // Hide link as spoiler
          { type: "spoiler", offset: visibleText.length, length: link.length }
        ]
      }
    });
  }

  // Send inline results back to Telegram
  await fetch(
    "https://api.telegram.org/bot" +
      env.BOT_TOKEN +
      "/answerInlineQuery",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inline_query_id: inlineQuery.id,
        results: results,
        cache_time: 1
      })
    }
  );
}

//
// =====================================================
// Helper: send normal message (used by /start)
// =====================================================
//
async function sendMessage(env, chatId, text) {
  await fetch(
    "https://api.telegram.org/bot" +
      env.BOT_TOKEN +
      "/sendMessage",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        disable_web_page_preview: true
      })
    }
  );
        }
