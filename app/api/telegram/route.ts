import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID;
const GITHUB_TOKEN       = process.env.GITHUB_TOKEN;
const REPO               = 'Damaka72/command-hub';
const FILE_PATH          = 'public/data/tasks.json';

const SITE_ALIASES: Record<string, string> = {
  tcc:   'theconcurrentcontractor',
  mycp:  'masteryourcareerpath',
  aivvp: 'aiviralvideoprompts',
  didi:  'didianolue',
  oot:   'oldoaktown',
  theconcurrentcontractor: 'theconcurrentcontractor',
  masteryourcareerpath:    'masteryourcareerpath',
  aiviralvideoprompts:     'aiviralvideoprompts',
  didianolue:              'didianolue',
  oldoaktown:              'oldoaktown',
};

interface TelegramMessage {
  message?: {
    text?: string;
    chat?: { id: number };
  };
}

async function sendReply(chatId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function readTasksFile(): Promise<{ sha: string; data: Record<string, { id: string; text: string; done: boolean }[]> } | null> {
  if (!GITHUB_TOKEN) return null;
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
    { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
  );
  if (!res.ok) return null;
  const file = await res.json() as { sha: string; content: string };
  const data = JSON.parse(Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf8'));
  return { sha: file.sha, data };
}

async function writeTasksFile(sha: string, data: Record<string, unknown>, message: string): Promise<boolean> {
  if (!GITHUB_TOKEN) return false;
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
        sha,
      }),
    }
  );
  return res.ok;
}

export async function POST(request: NextRequest) {
  const body   = await request.json() as TelegramMessage;
  const text   = body.message?.text?.trim() ?? '';
  const chatId = body.message?.chat?.id;

  if (TELEGRAM_CHAT_ID && chatId !== parseInt(TELEGRAM_CHAT_ID)) {
    return NextResponse.json({ ok: true });
  }
  if (!chatId) return NextResponse.json({ ok: true });

  // /help or /start
  if (text === '/help' || text === '/start') {
    await sendReply(chatId,
      `Command Hub Bot\n\n` +
      `/task <site> <text> — add a task\n` +
      `  Sites: tcc · mycp · aivvp · didi · oot\n` +
      `  Example: /task tcc Chase Constant Contact setup\n\n` +
      `/done <site> <text> — mark task done by partial match\n` +
      `/list <site> — list all tasks for a site\n` +
      `/status — open hub summary`
    );
    return NextResponse.json({ ok: true });
  }

  // /task <site> <text>
  const taskMatch = text.match(/^\/task\s+(\S+)\s+(.+)$/i);
  if (taskMatch) {
    const siteId   = SITE_ALIASES[taskMatch[1].toLowerCase()];
    const taskText = taskMatch[2].trim();
    if (!siteId) {
      await sendReply(chatId, `Unknown site "${taskMatch[1]}". Use: tcc, mycp, aivvp, didi, oot`);
      return NextResponse.json({ ok: true });
    }
    const file = await readTasksFile();
    if (!file) { await sendReply(chatId, 'Could not read tasks. Is GITHUB_TOKEN set in Vercel?'); return NextResponse.json({ ok: true }); }
    file.data[siteId] = [...(file.data[siteId] ?? []), { id: `tg-${Date.now()}`, text: taskText, done: false }];
    const ok = await writeTasksFile(file.sha, file.data, `chore: add task via Telegram for ${siteId}`);
    await sendReply(chatId, ok ? `Added to ${taskMatch[1].toUpperCase()}: "${taskText}"` : 'Failed to save task.');
    return NextResponse.json({ ok: true });
  }

  // /list <site>
  const listMatch = text.match(/^\/list\s+(\S+)$/i);
  if (listMatch) {
    const siteId = SITE_ALIASES[listMatch[1].toLowerCase()];
    if (!siteId) { await sendReply(chatId, `Unknown site. Use: tcc, mycp, aivvp, didi, oot`); return NextResponse.json({ ok: true }); }
    const file = await readTasksFile();
    if (!file) { await sendReply(chatId, 'Could not read tasks.'); return NextResponse.json({ ok: true }); }
    const tasks = file.data[siteId] ?? [];
    const reply = tasks.length === 0
      ? `No tasks for ${listMatch[1].toUpperCase()}.`
      : `${listMatch[1].toUpperCase()} tasks:\n\n` + tasks.map(t => `${t.done ? '✓' : '○'} ${t.text}`).join('\n');
    await sendReply(chatId, reply);
    return NextResponse.json({ ok: true });
  }

  // /done <site> <partial text>
  const doneMatch = text.match(/^\/done\s+(\S+)\s+(.+)$/i);
  if (doneMatch) {
    const siteId = SITE_ALIASES[doneMatch[1].toLowerCase()];
    if (!siteId) { await sendReply(chatId, `Unknown site. Use: tcc, mycp, aivvp, didi, oot`); return NextResponse.json({ ok: true }); }
    const file = await readTasksFile();
    if (!file) { await sendReply(chatId, 'Could not read tasks.'); return NextResponse.json({ ok: true }); }
    const tasks = file.data[siteId] ?? [];
    const idx   = tasks.findIndex(t => t.text.toLowerCase().includes(doneMatch[2].toLowerCase()));
    if (idx === -1) {
      await sendReply(chatId, `No task matching "${doneMatch[2]}" in ${doneMatch[1].toUpperCase()}.`);
    } else {
      tasks[idx].done = true;
      file.data[siteId] = tasks;
      const ok = await writeTasksFile(file.sha, file.data, `chore: mark task done via Telegram for ${siteId}`);
      await sendReply(chatId, ok ? `Done: "${tasks[idx].text}"` : 'Failed to save.');
    }
    return NextResponse.json({ ok: true });
  }

  await sendReply(chatId, 'Send /help for available commands.');
  return NextResponse.json({ ok: true });
}
