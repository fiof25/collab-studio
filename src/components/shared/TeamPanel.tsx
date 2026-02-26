import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Send } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { Avatar } from '@/components/shared/Avatar';
import { formatRelativeTime } from '@/utils/dateUtils';
import type { Collaborator } from '@/types/branch';

// ─── Mock data ────────────────────────────────────────────────────────────────

const now = Date.now();
const min = 1000 * 60;

const alice: Collaborator = {
  id: 'user_alice',
  name: 'Alice Kim',
  avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=alice&backgroundColor=b6e3f4',
  color: '#8B5CF6',
};
const bob: Collaborator = {
  id: 'user_bob',
  name: 'Bob Tran',
  avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=bob&backgroundColor=c0aede',
  color: '#06B6D4',
};
const clara: Collaborator = {
  id: 'user_clara',
  name: 'Clara Sun',
  avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=clara&backgroundColor=ffd5dc',
  color: '#EC4899',
};
const dan: Collaborator = {
  id: 'user_dan',
  name: 'Dan Park',
  avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=dan&backgroundColor=d1d4f9',
  color: '#F59E0B',
};

interface TeamMessage {
  id: string;
  author: Collaborator;
  content: string;
  timestamp: number;
}

const INITIAL_MESSAGES: TeamMessage[] = [
  { id: 'm1', author: bob,   content: 'hey just pushed updates to dark-mode branch', timestamp: now - min * 42 },
  { id: 'm2', author: clara, content: 'nice! the contrast on the hero text is way better now', timestamp: now - min * 38 },
  { id: 'm3', author: alice, content: 'agreed — branching off from it to try a no-gradient version', timestamp: now - min * 35 },
  { id: 'm4', author: dan,   content: 'can someone check the mobile-first branch? layout breaks at 375px', timestamp: now - min * 20 },
  { id: 'm5', author: bob,   content: 'on it', timestamp: now - min * 18 },
  { id: 'm6', author: clara, content: 'also saved a new version on hero-redesign if u wanna review @alice', timestamp: now - min * 5 },
];

interface OnlineMember {
  user: Collaborator;
  location: string;
  isYou?: boolean;
}

const ONLINE: OnlineMember[] = [
  { user: alice, location: 'hero-redesign', isYou: true },
  { user: bob,   location: 'dark-mode' },
  { user: clara, location: 'canvas' },
];

const OFFLINE: Collaborator[] = [dan];

// ─── Component ────────────────────────────────────────────────────────────────

export function TeamPanel() {
  const { teamPanelOpen, toggleTeamPanel } = useUIStore();
  const [tab, setTab] = useState<'chat' | 'call'>('chat');
  const [messages, setMessages] = useState<TeamMessage[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState('');
  const [inCall, setInCall] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, tab, teamPanelOpen]);

  const sendMessage = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      { id: `m${Date.now()}`, author: alice, content: trimmed, timestamp: Date.now() },
    ]);
    setDraft('');
  };

  return (
    <AnimatePresence>
      {teamPanelOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          className="fixed right-0 top-12 bottom-0 z-30 w-72 flex flex-col bg-surface-1 border-l border-line"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-line flex-shrink-0">
            <div className="flex items-center gap-2">
              {/* Tab pills */}
              {(['chat', 'call'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${
                    tab === t
                      ? 'bg-surface-3 text-ink-primary'
                      : 'text-ink-muted hover:text-ink-primary hover:bg-surface-2'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              onClick={toggleTeamPanel}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink-primary hover:bg-surface-2 transition-colors"
            >
              <X size={13} />
            </button>
          </div>

          {/* ── Chat tab ── */}
          {tab === 'chat' && (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
                {messages.map((msg, i) => {
                  const isYou = msg.author.id === 'user_alice';
                  const prevSame = i > 0 && messages[i - 1].author.id === msg.author.id;
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isYou ? 'flex-row-reverse' : ''}`}>
                      {/* Avatar — only show on first in a run */}
                      <div className="flex-shrink-0 w-6">
                        {!prevSame && <Avatar collaborator={msg.author} size="xs" />}
                      </div>

                      <div className={`flex flex-col gap-0.5 max-w-[78%] ${isYou ? 'items-end' : ''}`}>
                        {!prevSame && (
                          <div className={`flex items-baseline gap-1.5 ${isYou ? 'flex-row-reverse' : ''}`}>
                            <span className="text-2xs font-semibold" style={{ color: msg.author.color }}>
                              {isYou ? 'You' : msg.author.name.split(' ')[0]}
                            </span>
                            <span className="text-2xs text-ink-muted">
                              {formatRelativeTime(msg.timestamp)}
                            </span>
                          </div>
                        )}
                        <div
                          className={`px-2.5 py-1.5 rounded-xl text-xs leading-relaxed ${
                            isYou
                              ? 'bg-accent-violet text-white rounded-tr-sm'
                              : 'bg-surface-2 text-ink-secondary rounded-tl-sm'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input */}
              <div className="flex-shrink-0 px-3 pb-3 pt-2 border-t border-line">
                <div className="flex items-center gap-2 bg-surface-2 rounded-xl px-3 py-2">
                  <input
                    className="flex-1 bg-transparent text-xs text-ink-primary placeholder:text-ink-muted outline-none"
                    placeholder="Message the team…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!draft.trim()}
                    className="text-ink-muted hover:text-accent-violet disabled:opacity-30 transition-colors"
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── Call tab ── */}
          {tab === 'call' && (
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">

              {/* Call controls */}
              <div className={`rounded-xl p-4 border ${inCall ? 'border-accent-violet/40 bg-accent-violet/5' : 'border-line bg-surface-2'}`}>
                {inCall ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-xs font-semibold text-ink-primary">In call</div>
                        <div className="text-2xs text-ink-muted mt-0.5">with Bob, Clara</div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-status-active animate-pulse-slow" />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setMicOn((v) => !v)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-2xs font-medium transition-colors ${
                          micOn ? 'bg-surface-3 text-ink-primary' : 'bg-red-500/15 text-red-400'
                        }`}
                      >
                        {micOn ? <Mic size={11} /> : <MicOff size={11} />}
                        {micOn ? 'Mic on' : 'Muted'}
                      </button>
                      <button
                        onClick={() => setVideoOn((v) => !v)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-2xs font-medium transition-colors ${
                          videoOn ? 'bg-surface-3 text-ink-primary' : 'bg-surface-3 text-ink-muted'
                        }`}
                      >
                        {videoOn ? <Video size={11} /> : <VideoOff size={11} />}
                        {videoOn ? 'Video on' : 'Video off'}
                      </button>
                      <button
                        onClick={() => setInCall(false)}
                        className="p-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                      >
                        <PhoneOff size={11} />
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setInCall(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-accent-violet hover:bg-accent-violet-dark text-white text-xs font-medium transition-colors"
                  >
                    <Phone size={13} />
                    Start call
                  </button>
                )}
              </div>

              {/* Online now */}
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-status-active" />
                  <span className="text-2xs font-medium text-ink-muted">Online now</span>
                </div>
                <div className="flex flex-col gap-2">
                  {ONLINE.map(({ user, location, isYou }) => (
                    <div key={user.id} className="flex items-center gap-2.5">
                      <Avatar collaborator={user} size="xs" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-ink-primary truncate">
                          {isYou ? 'You' : user.name.split(' ')[0]}
                        </div>
                        <div className="text-2xs text-ink-muted truncate">{location}</div>
                      </div>
                      {inCall && (
                        <div className="w-1.5 h-1.5 rounded-full bg-accent-violet flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Offline */}
              {OFFLINE.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-status-archived" />
                    <span className="text-2xs font-medium text-ink-muted">Offline</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {OFFLINE.map((user) => (
                      <div key={user.id} className="flex items-center gap-2.5 opacity-50">
                        <Avatar collaborator={user} size="xs" />
                        <span className="text-xs text-ink-secondary">{user.name.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
