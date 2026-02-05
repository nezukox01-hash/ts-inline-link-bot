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

      // /start welcome message (health check)
      const msg = update.message || update.edited_message;
      if (msg && msg.chat && msg.text && msg.text.startsWith("/start")) {
        await sendMessage(
          env,
          msg.chat.id,
          "👋 Welcome!\n\n✅ Bot is deployed & running.\n\n" +
            "Inline usage (NO need | ):\n" +
            "@TSquicklink_bot Notes www.fb.com\n\n" +
            "Last word must be the link."
        );
      }

      return new Response("OK", { status: 200 });
    } catch (e) {
      // Never return 500 to Telegram
      return new Response("OK", { status: 200 });
    }
  }
};

// ---- Parse: "Title words ... <link>" (last word is link) ----
function parseTitleAndLink(input) {
  const s = (input || "").trim();
  if (!s) return { title: "Link", link: "" };

  const parts = s.split(/\s+/);
  const last = parts[parts.length - 1];

  if (last.startsWith("http") || last.startsWith("www.")) {
    const link = last.startsWith("http") ? last : "https://" + last;
    const title = parts.slice(0, -1).join(" ").trim() || "Link";
    return { title, link };
  }

  return { title: s, link: "" };
}

// ---- Inline handler ----
async function handleInline(inlineQuery, env) {
  const q = (inlineQuery.query || "").trim();
  const parsed = parseTitleAndLink(q);

  const title = parsed.title;
  const link = parsed.link;

  const results = [];

  if (!link) {
    results.push({
      type: "article",
      id: "help",
      title: "Type: Title then Link",
      description: "Example: Notes www.fb.com",
      input_message_content: {
        message_text:
          "Example:\n@TSquicklink_bot Notes www.fb.com\n\n" +
          "Tip: last word must be link (http... or www...)",
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

// ---- helper: send normal message ----
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
}    body: JSON.stringify({
      inline_query_id: inlineQuery.id,
      results,
      cache_time: 1
    })
  });
}

// -------- Send message helper --------
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
```0      cache_time: 1
    })
  });
}

// ---------- SEND MESSAGE ----------
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
