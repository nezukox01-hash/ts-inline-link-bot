export default {
  async fetch(request, env) {
    try {
      if (request.method !== "POST") {
        return new Response("OK", { status: 200 });
      }

      const update = await request.json();

      // ========== INLINE MODE ==========
      if (update.inline_query) {
        await handleInline(update.inline_query, env);
        return new Response("OK", { status: 200 });
      }

      // ========== NORMAL MESSAGE (/start) ==========
      const msg = update.message || update.edited_message;
      if (!msg || !msg.chat || !msg.text) {
        return new Response("OK", { status: 200 });
      }

      // /start command
      if (msg.text.startsWith("/start")) {
        await sendMessage(
          env,
          msg.chat.id,
          "👋 Welcome!\n\n" +
          "✅ Bot is deployed & running successfully.\n\n" +
          "🔹 How to use inline mode:\n" +
          "@YourBotUsername Title | https://t.me/username/123\n\n" +
          "Example:\n" +
          "@YourBotUsername Notes | https://t.me/mygroup/55"
        );
        return new Response("OK", { status: 200 });
      }

      return new Response("OK", { status: 200 });

    } catch (e) {
      return new Response("OK", { status: 200 });
    }
  }
};

// ---------- INLINE HANDLER ----------
function parseTitleAndLink(input) {
  const s = (input || "").trim();

  if (s.includes("|")) {
    const [t, l] = s.split("|").map(x => x.trim());
    return { title: t || "🔗 Link", link: l || "" };
  }

  if (s.startsWith("http")) {
    return { title: "🔗 Link", link: s };
  }

  return { title: "🔗 Link", link: "" };
}

async function handleInline(inlineQuery, env) {
  const q = (inlineQuery.query || "").trim();
  const { title, link } = parseTitleAndLink(q);

  const results = [];

  if (!link) {
    results.push({
      type: "article",
      id: "help",
      title: "Type: Title | Link",
      description: "Example: Notes | https://t.me/mygroup/55",
      input_message_content: {
        message_text:
          "ℹ️ Inline usage:\n" +
          "Title | https://t.me/username/123",
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
