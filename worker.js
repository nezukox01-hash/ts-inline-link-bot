export default {
  async fetch(request, env) {
    try {
      if (request.method !== "POST") return new Response("OK", { status: 200 });

      const update = await request.json();

      // Inline mode
      if (update.inline_query) {
        await handleInline(update.inline_query, env);
        return new Response("OK", { status: 200 });
      }

      // /start (health check)
      const msg = update.message || update.edited_message;
      if (msg && msg.chat && msg.text && msg.text.startsWith("/start")) {
        await sendMessage(
          env,
          msg.chat.id,
          "👋 Welcome!\n\n✅ Bot is running.\n\n" +
            "✅ Use inline (NO need | ):\n" +
            "@TSquicklink_bot Notes www.fb.com\n\n" +
            "Optional old style:\n" +
            "@TSquicklink_bot Notes | www.fb.com"
        );
      }

      return new Response("OK", { status: 200 });
    } catch (e) {
      return new Response("OK", { status: 200 });
    }
  }
};

// ---- Robust parse: supports BOTH formats ----
// 1) "Title words ... <link>"  (auto, last link)
// 2) "Title | <link>"          (optional old style)
// 3) "<link>"                  (title auto)
function parseTitleAndLink(input) {
  let s = (input || "").trim();
  if (!s) return { title: "Link", link: "" };

  // Old style: Title | link
  if (s.includes("|")) {
    const parts = s.split("|").map(x => x.trim()).filter(Boolean);
    const title = parts[0] || "Link";
    const linkRaw = parts[1] || "";
    const link = normalizeLink(linkRaw);
    return { title, link };
  }

  // Auto style: detect FIRST link-like token anywhere
  // (not only last word; more flexible)
  const tokens = s.split(/\s+/);
  let linkIndex = -1;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (looksLikeLink(t)) {
      linkIndex = i;
      break;
    }
  }

  if (linkIndex === -1) {
    // No link found
    return { title: s, link: "" };
  }

  const link = normalizeLink(tokens[linkIndex]);
  const titleTokens = tokens.slice(0, linkIndex);
  const title = titleTokens.join(" ").trim() || "Link";
  return { title, link };
}

function looksLikeLink(t) {
  if (!t) return false;
  const x = t.trim();
  return (
    x.startsWith("http://") ||
    x.startsWith("https://") ||
    x.startsWith("www.") ||
    x.includes(".com") ||
    x.includes(".net") ||
    x.includes(".org") ||
    x.includes("t.me/")
  );
}

function normalizeLink(raw) {
  const x = (raw || "").trim();
  if (!x) return "";
  if (x.startsWith("http://") || x.startsWith("https://")) return x;
  return "https://" + x; // handles www.fb.com, t.me/..., etc.
}

// ---- Inline handler ----
async function handleInline(inlineQuery, env) {
  const q = (inlineQuery.query || "").trim();
  const { title, link } = parseTitleAndLink(q);

  const results = [];

  if (!link) {
    results.push({
      type: "article",
      id: "help",
      title: "TOUHID says,Type: Title then Link",
      results.push({
  type: "article",
  id: "help",
  title: "Type: Title then Link",
  description: "Example: Notes www.fb.com or Notes | www.fb.com",
  input_message_content: {
    message_text:
      "✅ Example (NO need | ):\n" +
      "@TSquicklink_bot Notes www.fb.com\n\n" +
      "Optional:\n" +
      "@TSquicklink_bot Notes | www.fb.com",
    disable_web_page_preview: true
  }
});
    } else {
    const visible = title + "\n";
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

  await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/answerInlineQuery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inline_query_id: inlineQuery.id,
      results: results,
      cache_time: 1
    })
  });
}

// ---- helper ----
async function sendMessage(env, chatId, text) {
  await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/sendMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      disable_web_page_preview: true
    })
  });
}
