export default {
  async fetch(request, env) {
    try {
      if (request.method !== "POST") {
        return new Response("OK", { status: 200 });
      }

      const update = await request.json();

      // ===== INLINE MODE =====
      if (update.inline_query) {
        await handleInline(update.inline_query, env);
        return new Response("OK", { status: 200 });
      }

      // ===== NORMAL MESSAGE (/start) =====
      const msg = update.message || update.edited_message;
      if (msg && msg.chat && msg.text) {
        if (msg.text.startsWith("/start")) {
          await sendMessage(
            env,
            msg.chat.id,
            "👋 Welcome!\n\n" +
              "✅ Bot is deployed & running.\n\n" +
              "🔹 Inline usage (NO need | ):\n" +
              "@TSquicklink_bot Notes www.fb.com\n\n" +
              "It will send:\n" +
              "• Title = **bold**\n" +
              "• Link = hidden (spoiler)\n" +
              "• Preview card = OFF"
          );
        }
      }

      return new Response("OK", { status: 200 });
    } catch (e) {
      // Never return 500 to Telegram
      return new Response("OK", { status: 200 });
    }
  }
};

// -------- Parse: "Title words ... <link>" (no need | ) --------
function parseTitleAndLink(input) {
  const s = (input || "").trim();
  if (!s) return { title: "🔗 Link", link: "" };

  const parts = s.split(/\s+/);
  const last = parts[parts.length - 1];

  // Detect link automatically as the LAST word
  if (last.startsWith("http") || last.startsWith("www.")) {
    const link = last.startsWith("http") ? last : "https://" + last;
    const title = parts.slice(0, -1).join(" ") || "🔗 Link";
    return { title, link };
  }

  return { title: s, link: "" };
}

// -------- Inline handler --------
async function handleInline(inlineQuery, env) {
  const q = (inlineQuery.query || "").trim();
  const { title, link } = parseTitleAndLink(q);

  const results = [];

  if (!link) {
    results.push({
      type: "article",
      id: "help",
      title: "Type: Title then Link",
      description: "Example: Notes www.fb.com",
      input_message_content: {
        message_text:
          "ℹ️ Write like this:\n" +
          "@TSquicklink_bot Notes www.fb.com\n\n" +
          "Last word must be the link (http... or www...).",
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
          { type: "bold", offset: 0, length: title.length }, // title bold
          { type: "spoiler", offset: visible.length, length: link.length } // link hidden
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
