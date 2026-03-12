import { useState, useEffect, useRef } from "react";

async function loadStorage(key) {
  try { const val = localStorage.getItem(key); return val ? JSON.parse(val) : null; }
  catch { return null; }
}
async function saveStorage(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

const TABS = ["profile", "convert", "generate", "library"];
const TAB_LABELS = { profile: "Devi's Profile", convert: "IG → Threads", generate: "Generate", library: "Library" };
const TAB_ICONS  = { profile: "◈", convert: "⇢", generate: "✦", library: "▤" };

const NEVER_DOS = `THINGS SHE NEVER DOES — follow these strictly:
- Never lectures or moralizes
- Never uses heavy hashtags
- Never promotes from a place of ego
- Never posts without emotional truth behind it
- Never sounds like a life coach template
- Never capitalizes for hype — only for emphasis (e.g. "FEEL", "THIS")
- Never uses corporate or marketing language
- Never writes something that sounds like it came from a brand account`;

const DEFAULT_CATS  = ["Thought Leadership", "Behind the Scenes", "Opinion", "Engagement Hook", "Product / Partnership", "Personal"];
const DEFAULT_TONES = ["Conversational", "Bold & Direct", "Thought-Provoking", "Witty", "Educational", "Raw / Honest"];
const DEFAULT_PROFILE = {
  name: "Devi", bio: "", voiceNotes: "", topics: "", examplePosts: "",
  monthlyGoal: 30, categories: DEFAULT_CATS, tones: DEFAULT_TONES,
};

let uid = Date.now();
function nextId() { return `t_${uid++}`; }

async function callClaude(prompt, system = "") {
  const body = { model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] };
  if (system) body.system = system;
  const res  = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

function buildSystem(profile) {
  return `You are a ghostwriter for ${profile.name || "Devi"}, writing Threads posts in her authentic voice.
${profile.bio         ? `\nWHO SHE IS:\n${profile.bio}` : ""}
${profile.voiceNotes  ? `\nHER VOICE & STYLE:\n${profile.voiceNotes}` : ""}
${profile.topics      ? `\nTOPICS SHE TALKS ABOUT:\n${profile.topics}` : ""}
${profile.examplePosts? `\nEXAMPLES OF HER ACTUAL POSTS:\n${profile.examplePosts}` : ""}

${NEVER_DOS}

Write exactly like her. Match her cadence, vocabulary, and energy.`;
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Pill({ children, color = "#1e1e1e", text = "#9ca3af" }) {
  return (
    <span style={{ background: color, color: text, fontSize: "10px", fontFamily: "'DM Mono', monospace", padding: "2px 9px", borderRadius: "20px", letterSpacing: "0.06em", display: "inline-block", whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

const VARIANTS = {
  default: { bg: "#1e1e1e", color: "#d1d5db", border: "#2e2e2e" },
  primary: { bg: "#f59e0b", color: "#000",    border: "#f59e0b" },
  green:   { bg: "#052a14", color: "#34d399", border: "#064e27" },
  amber:   { bg: "#1a1100", color: "#f59e0b", border: "#3a2500" },
  danger:  { bg: "#1a0505", color: "#f87171", border: "#3a0a0a" },
  pin:     { bg: "#0d1a2e", color: "#60a5fa", border: "#1e3a5f" },
};

function Btn({ children, onClick, disabled, variant = "default", sx = {}, title }) {
  const v = VARIANTS[variant] || VARIANTS.default;
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{ background: v.bg, color: v.color, border: `1px solid ${v.border}`, borderRadius: "8px", padding: "6px 13px", fontSize: "11px", fontFamily: "'DM Mono', monospace", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, letterSpacing: "0.04em", transition: "all 0.15s", whiteSpace: "nowrap", ...sx }}>
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <label style={{ display: "block", fontSize: "10px", color: "#6b7280", fontFamily: "'DM Mono', monospace", letterSpacing: "0.12em", marginBottom: "8px", textTransform: "uppercase" }}>{label}</label>
      {children}
    </div>
  );
}

const inputCss = { background: "#111", border: "1px solid #222", borderRadius: "10px", color: "#e5e7eb", padding: "11px 14px", fontSize: "14px", fontFamily: "'Newsreader', Georgia, serif", width: "100%", boxSizing: "border-box", outline: "none", lineHeight: "1.6", transition: "border-color 0.2s" };

function Input({ value, onChange, placeholder, rows }) {
  if (rows) return <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={{ ...inputCss, resize: "vertical" }} />;
  return <input value={value} onChange={onChange} placeholder={placeholder} style={inputCss} />;
}

// ── Tag Editor (for categories & tones) ───────────────────────────────────────
function TagEditor({ label, subtitle, items, onChange }) {
  const [input, setInput] = useState("");
  function add() {
    const v = input.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setInput("");
  }
  function remove(item) { onChange(items.filter(i => i !== item)); }
  function handleKey(e) { if (e.key === "Enter") { e.preventDefault(); add(); } }

  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ fontSize: "10px", color: "#6b7280", fontFamily: "'DM Mono', monospace", letterSpacing: "0.12em", marginBottom: "4px", textTransform: "uppercase" }}>{label}</div>
      {subtitle && <div style={{ fontSize: "11px", color: "#4b5563", fontFamily: "'DM Mono', monospace", marginBottom: "10px" }}>{subtitle}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
        {items.map(item => (
          <span key={item} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "20px", padding: "4px 12px 4px 14px", fontSize: "12px", fontFamily: "'DM Mono', monospace", color: "#d1d5db" }}>
            {item}
            <button onClick={() => remove(item)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "13px", padding: 0, lineHeight: 1, display: "flex", alignItems: "center" }}>✕</button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder={`Add a new ${label.toLowerCase().slice(0, -1)}…`}
          style={{ ...inputCss, flex: 1, padding: "9px 14px", fontSize: "13px" }} />
        <button onClick={add} style={{ background: "#1a1100", border: "1px solid #3a2500", borderRadius: "9px", color: "#f59e0b", fontSize: "12px", fontFamily: "'DM Mono', monospace", padding: "8px 18px", cursor: "pointer", whiteSpace: "nowrap" }}>+ Add</button>
      </div>
    </div>
  );
}

// ── Thread Post Card ──────────────────────────────────────────────────────────
function ThreadPostCard({ post, onApprove, onEdit, onRegen, onDelete, onPin, onTogglePosted, onMoreLikeThis, busy, tones }) {
  const [editing, setEditing]     = useState(false);
  const [draft, setDraft]         = useState(post.content);
  const [showTonePicker, setShow] = useState(false);
  const chars = draft.length;
  const over  = chars > 500;
  const activeTones = tones || DEFAULT_TONES;

  useEffect(() => { if (!editing) setDraft(post.content); }, [post.content]);
  function save() { onEdit(post.id, draft); setEditing(false); }

  const cardBg     = post.pinned ? "#0d1a2e" : post.posted ? "#111" : post.approved ? "#071a0e" : "#0e0e0e";
  const cardBorder = post.pinned ? "#1e3a5f" : post.posted ? "#2a2a2a" : post.approved ? "#134d26" : "#1e1e1e";

  return (
    <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: "14px", padding: "18px 20px", marginBottom: "12px", transition: "all 0.2s", position: "relative", opacity: post.posted ? 0.55 : 1 }}>
      <div style={{ position: "absolute", top: 0, right: 0, display: "flex" }}>
        {post.pinned    && <div style={{ background: "#1d4ed8", color: "#fff",    fontSize: "9px", fontFamily: "'DM Mono', monospace", fontWeight: 700, padding: "3px 10px", letterSpacing: "0.1em" }}>📌 PINNED</div>}
        {post.posted    && <div style={{ background: "#374151", color: "#9ca3af", fontSize: "9px", fontFamily: "'DM Mono', monospace", fontWeight: 700, padding: "3px 10px", borderBottomLeftRadius: "10px", letterSpacing: "0.1em" }}>POSTED ✓</div>}
        {!post.posted && post.approved && <div style={{ background: "#16a34a", color: "#000", fontSize: "9px", fontFamily: "'DM Mono', monospace", fontWeight: 700, padding: "3px 10px", borderBottomLeftRadius: "10px", letterSpacing: "0.1em" }}>APPROVED</div>}
      </div>

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px", paddingRight: "90px" }}>
        {post.source   && <Pill color="#1a1207" text="#d97706">{post.source}</Pill>}
        {post.category && <Pill>{post.category}</Pill>}
        {post.tone     && <Pill>{post.tone}</Pill>}
        <Pill color={over ? "#1a0505" : "#1a1a1a"} text={over ? "#f87171" : "#6b7280"}>{chars}/500</Pill>
      </div>

      {editing ? (
        <>
          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={5} style={{ ...inputCss, resize: "vertical", marginBottom: "10px" }} />
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Btn onClick={() => { setDraft(post.content); setEditing(false); }}>Cancel</Btn>
            <Btn variant="primary" onClick={save} disabled={over}>Save</Btn>
          </div>
        </>
      ) : (
        <>
          <p style={{ color: busy ? "#4b5563" : "#d1d5db", fontSize: "15px", lineHeight: "1.75", margin: "0 0 14px", whiteSpace: "pre-wrap", fontFamily: "'Newsreader', Georgia, serif", fontStyle: busy ? "italic" : "normal" }}>
            {busy ? "Working on it…" : post.content}
          </p>

          {/* AI quick actions */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
            <Btn onClick={() => onRegen(post.id, "shorter")}  disabled={busy}>↓ Shorter</Btn>
            <Btn onClick={() => onRegen(post.id, "longer")}   disabled={busy}>↑ Longer</Btn>
            <Btn onClick={() => onMoreLikeThis(post.id)}      disabled={busy}>✦ More like this</Btn>
            <div style={{ position: "relative" }}>
              <Btn onClick={() => setShow(p => !p)} disabled={busy}>↺ Regen tone ▾</Btn>
              {showTonePicker && (
                <div style={{ position: "absolute", top: "110%", left: 0, zIndex: 50, background: "#161616", border: "1px solid #2a2a2a", borderRadius: "10px", padding: "6px", minWidth: "180px", boxShadow: "0 8px 32px #000a" }}>
                  {activeTones.map(t => (
                    <button key={t} onClick={() => { onRegen(post.id, "tone", t); setShow(false); }}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 12px", background: "none", border: "none", color: "#d1d5db", fontSize: "12px", fontFamily: "'DM Mono', monospace", cursor: "pointer", borderRadius: "6px" }}
                      onMouseEnter={e => e.target.style.background = "#222"}
                      onMouseLeave={e => e.target.style.background = "none"}
                    >{t}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Management */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Btn variant="danger" onClick={() => onDelete(post.id)}>✕</Btn>
            <Btn variant="pin"   onClick={() => onPin(post.id)}>{post.pinned ? "Unpin" : "📌 Pin"}</Btn>
            <Btn onClick={() => setEditing(true)}>✏ Edit</Btn>
            <Btn variant={post.posted ? "default" : "amber"} onClick={() => onTogglePosted(post.id)}>
              {post.posted ? "↩ Unmark" : "Posted ✓"}
            </Btn>
            {!post.approved && !post.posted && <Btn variant="green" onClick={() => onApprove(post.id)}>✓ Approve</Btn>}
          </div>
        </>
      )}
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab({ profile, setProfile, saving }) {
  const cats  = profile.categories || DEFAULT_CATS;
  const tones = profile.tones      || DEFAULT_TONES;

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ margin: "0 0 6px", fontSize: "20px", fontFamily: "'Playfair Display', serif", color: "#f9fafb" }}>Devi's Profile</h2>
        <p style={{ margin: 0, fontSize: "13px", color: "#6b7280", fontFamily: "'DM Mono', monospace" }}>The brain of the machine. More detail = AI sounds more like her.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <div>
          <Field label="Who is Devi?">
            <Input value={profile.bio} rows={5} placeholder="Her background, what she's known for, what she's building..." onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} />
          </Field>
          <Field label="Her voice & style notes">
            <Input value={profile.voiceNotes} rows={5} placeholder="How she speaks, her cadence, what makes her sound like her..." onChange={e => setProfile(p => ({ ...p, voiceNotes: e.target.value }))} />
          </Field>
        </div>
        <div>
          <Field label="Topics she talks about">
            <Input value={profile.topics} rows={5} placeholder="Brand partnerships, creator economy, life as a founder..." onChange={e => setProfile(p => ({ ...p, topics: e.target.value }))} />
          </Field>
          <Field label="Example Threads posts (paste 3–10 real ones)">
            <Input value={profile.examplePosts} rows={5} placeholder={"Paste real posts separated by ---\n\nThe AI will study her exact patterns."} onChange={e => setProfile(p => ({ ...p, examplePosts: e.target.value }))} />
          </Field>
        </div>
      </div>

      <Field label="Monthly Threads goal">
        <input type="number" min={1} max={500} value={profile.monthlyGoal}
          onChange={e => setProfile(p => ({ ...p, monthlyGoal: Number(e.target.value) }))}
          style={{ ...inputCss, width: "120px" }} />
      </Field>

      <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: "24px", marginTop: "8px" }}>
        <TagEditor
          label="Categories"
          subtitle="Used as tags in Generate & shown on every post card. Add, remove, or rename to match how Devi thinks about her content."
          items={cats}
          onChange={v => setProfile(p => ({ ...p, categories: v }))}
        />
        <TagEditor
          label="Tones"
          subtitle="Available in Generate and the Regen tone picker. Customize to match Devi's actual modes."
          items={tones}
          onChange={v => setProfile(p => ({ ...p, tones: v }))}
        />
      </div>

      <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "18px 20px", marginTop: "8px" }}>
        <div style={{ fontSize: "10px", color: "#f59e0b", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", marginBottom: "12px" }}>ALWAYS-ON RULES — baked into every generation</div>
        {["Never lectures or moralizes", "Never uses heavy hashtags", "Never promotes from a place of ego", "Never posts without emotional truth behind it", "Never sounds like a life coach template", 'Never capitalizes for hype — only for emphasis (e.g. "FEEL")'].map(r => (
          <div key={r} style={{ fontSize: "12px", color: "#6b7280", fontFamily: "'DM Mono', monospace", marginBottom: "6px" }}>
            <span style={{ color: "#ef4444", marginRight: "8px" }}>✕</span>{r}
          </div>
        ))}
      </div>

      {saving && <p style={{ color: "#34d399", fontSize: "12px", fontFamily: "'DM Mono', monospace", marginTop: "12px" }}>✓ Profile saved</p>}
    </div>
  );
}

// ── Convert Tab ───────────────────────────────────────────────────────────────
function ConvertTab({ profile, addPosts }) {
  const [caption, setCaption] = useState("");
  const [count, setCount]     = useState("smart");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function convert() {
    if (!caption.trim()) { setError("Paste an Instagram caption first."); return; }
    setError(""); setLoading(true);
    const num = count === "smart"
      ? "Decide the best number of posts (usually 3–6). Each idea gets its own standalone post."
      : `Break this into exactly ${count} Threads posts.`;
    const prompt = `Take this Instagram caption and transform it into separate Threads posts in Devi's voice.

INSTAGRAM CAPTION:
"${caption}"

INSTRUCTIONS:
- ${num}
- Each post must be under 500 characters
- Each post must make complete sense on its own — the reader has NOT seen the Instagram post
- If a post references something that needs context, add a brief natural phrase to ground it — conversational, not explanatory
- Rewrite in Threads style: casual, shorter sentences, not caption-y
- Strip hashtags, location tags, and IG-specific formatting
- Separate each post with ---
- Write ONLY the posts, no labels, no numbering, no preamble`;

    try {
      const raw   = await callClaude(prompt, buildSystem(profile));
      const parts = raw.split(/\n?---+\n?/).map(s => s.trim()).filter(Boolean);
      addPosts(parts.map(content => ({ id: nextId(), content, approved: false, source: "IG Convert", category: "", tone: "", pinned: false, posted: false })));
      setCaption("");
    } catch { setError("Something went wrong. Try again."); }
    setLoading(false);
  }

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ margin: "0 0 6px", fontSize: "20px", fontFamily: "'Playfair Display', serif", color: "#f9fafb" }}>Instagram → Threads</h2>
        <p style={{ margin: 0, fontSize: "13px", color: "#6b7280", fontFamily: "'DM Mono', monospace" }}>Paste any IG caption. The AI breaks it into punchy standalone posts — with just enough context so each one lands on its own.</p>
      </div>
      <Field label="Paste Instagram caption">
        <Input value={caption} rows={8} placeholder="Paste the full Instagram caption here — long-form, hashtags and all." onChange={e => setCaption(e.target.value)} />
      </Field>
      <Field label="How many Threads posts?">
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {["smart", "2", "3", "4", "5", "6", "8"].map(n => (
            <button key={n} onClick={() => setCount(n)} style={{ padding: "7px 16px", borderRadius: "8px", fontSize: "12px", fontFamily: "'DM Mono', monospace", cursor: "pointer", border: `1px solid ${count === n ? "#f59e0b" : "#2a2a2a"}`, background: count === n ? "#1a1100" : "#111", color: count === n ? "#f59e0b" : "#6b7280", transition: "all 0.15s" }}>
              {n === "smart" ? "✦ Smart split" : n}
            </button>
          ))}
        </div>
      </Field>
      {!profile.bio && !profile.voiceNotes && (
        <div style={{ background: "#1a1100", border: "1px solid #3a2800", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", fontSize: "12px", color: "#d97706", fontFamily: "'DM Mono', monospace" }}>
          ⚠ Fill out Devi's Profile first — the AI will sound much more like her with voice notes and examples.
        </div>
      )}
      {error && <p style={{ color: "#f87171", fontSize: "13px", marginBottom: "12px" }}>{error}</p>}
      <button onClick={convert} disabled={loading} style={{ width: "100%", padding: "13px", borderRadius: "12px", background: loading ? "#1a1a1a" : "#f59e0b", color: loading ? "#6b7280" : "#000", border: "none", fontSize: "13px", fontFamily: "'DM Mono', monospace", cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.05em" }}>
        {loading ? "Converting…" : "⇢ Convert to Threads Posts"}
      </button>
    </div>
  );
}

// ── Generate Tab ──────────────────────────────────────────────────────────────
function GenerateTab({ profile, addPosts }) {
  const cats  = profile.categories?.length ? profile.categories : DEFAULT_CATS;
  const tones = profile.tones?.length      ? profile.tones      : DEFAULT_TONES;
  const [topic, setTopic]     = useState("");
  const [tone, setTone]       = useState(tones[0]);
  const [cat, setCat]         = useState(cats[0]);
  const [count, setCount]     = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // keep selects in sync if profile changes
  useEffect(() => { if (!tones.includes(tone)) setTone(tones[0]); }, [profile.tones]);
  useEffect(() => { if (!cats.includes(cat))   setCat(cats[0]);   }, [profile.categories]);

  async function generate() {
    if (!topic.trim()) { setError("Enter a topic or brief."); return; }
    setError(""); setLoading(true);
    const prompt = `Write exactly ${count} Threads posts for Devi on this topic: "${topic}"\nTone: ${tone}\nCategory: ${cat}\nRules:\n- Each post under 500 characters\n- Each post is standalone and punchy\n- Separate each with ---\n- Write ONLY the posts, no labels or numbering`;
    try {
      const raw   = await callClaude(prompt, buildSystem(profile));
      const parts = raw.split(/\n?---+\n?/).map(s => s.trim()).filter(Boolean);
      addPosts(parts.map(content => ({ id: nextId(), content, approved: false, source: "Generated", category: cat, tone, pinned: false, posted: false })));
    } catch { setError("Generation failed. Try again."); }
    setLoading(false);
  }

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ margin: "0 0 6px", fontSize: "20px", fontFamily: "'Playfair Display', serif", color: "#f9fafb" }}>Generate from a Topic</h2>
        <p style={{ margin: 0, fontSize: "13px", color: "#6b7280", fontFamily: "'DM Mono', monospace" }}>Give a brief or topic and the AI writes fresh posts in Devi's voice.</p>
      </div>
      <Field label="Topic or brief">
        <Input value={topic} rows={3} placeholder="e.g. Why most brand deals are a waste of time for small creators..." onChange={e => setTopic(e.target.value)} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Field label="Tone">
          <select value={tone} onChange={e => setTone(e.target.value)} style={inputCss}>
            {tones.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Category">
          <select value={cat} onChange={e => setCat(e.target.value)} style={inputCss}>
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <Field label="How many posts?">
        <div style={{ display: "flex", gap: "8px" }}>
          {[1, 3, 5, 10].map(n => (
            <button key={n} onClick={() => setCount(n)} style={{ padding: "7px 16px", borderRadius: "8px", fontSize: "12px", fontFamily: "'DM Mono', monospace", cursor: "pointer", border: `1px solid ${count === n ? "#f59e0b" : "#2a2a2a"}`, background: count === n ? "#1a1100" : "#111", color: count === n ? "#f59e0b" : "#6b7280", transition: "all 0.15s" }}>{n}</button>
          ))}
        </div>
      </Field>
      {error && <p style={{ color: "#f87171", fontSize: "13px", marginBottom: "12px" }}>{error}</p>}
      <button onClick={generate} disabled={loading} style={{ width: "100%", padding: "13px", borderRadius: "12px", background: loading ? "#1a1a1a" : "#f59e0b", color: loading ? "#6b7280" : "#000", border: "none", fontSize: "13px", fontFamily: "'DM Mono', monospace", cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.05em" }}>
        {loading ? "Generating…" : `✦ Generate ${count} Post${count > 1 ? "s" : ""}`}
      </button>
    </div>
  );
}

// ── Library Tab ───────────────────────────────────────────────────────────────
function LibraryTab({ posts, setPosts, profile }) {
  const [filter, setFilter] = useState("all");
  const [busy, setBusy]     = useState(null);

  const pinned   = posts.filter(p => p.pinned);
  const queue    = posts.filter(p => !p.approved && !p.posted && !p.pinned);
  const approved = posts.filter(p => p.approved && !p.posted);
  const posted   = posts.filter(p => p.posted);
  const progress = Math.min((approved.length / (profile.monthlyGoal || 30)) * 100, 100);

  const filterMap = { all: posts, pinned, queue, approved, posted };
  const shown = (filterMap[filter] || posts).slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  function update(id, patch) { setPosts(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p)); }
  function approvePost(id)       { update(id, { approved: true }); }
  function editPost(id, content) { update(id, { content }); }
  function deletePost(id)        { setPosts(ps => ps.filter(p => p.id !== id)); }
  function pinPost(id)           { update(id, { pinned: !posts.find(p => p.id === id)?.pinned }); }
  function togglePosted(id)      { const cur = posts.find(p => p.id === id); update(id, { posted: !cur?.posted, approved: false }); }

  async function regenPost(id, mode, tone) {
    setBusy(id);
    const post = posts.find(p => p.id === id);
    const sys  = buildSystem(profile);
    let prompt = "";
    if (mode === "shorter") prompt = `Rewrite this Threads post shorter and punchier — cut at least 30% but keep the core idea:\n"${post.content}"\n\nWrite ONLY the new post.`;
    else if (mode === "longer") prompt = `Expand this Threads post — add a bit more texture or a specific detail. Stay under 500 characters:\n"${post.content}"\n\nWrite ONLY the new post.`;
    else if (mode === "tone")   prompt = `Rewrite this Threads post in a ${tone} tone, same idea but different energy:\n"${post.content}"\n\nWrite ONLY the new post, under 500 characters.`;
    else                        prompt = `Rewrite this Threads post completely differently, same core idea:\n"${post.content}"\n\nWrite ONLY the new post, under 500 characters.`;
    try { const raw = await callClaude(prompt, sys); editPost(id, raw.trim()); } catch {}
    setBusy(null);
  }

  async function moreLikeThis(id) {
    setBusy("generating");
    const post = posts.find(p => p.id === id);
    const prompt = `Write 3 new Threads posts in the EXACT same style, energy, and format as this one — same length, same vibe, different ideas:\n\n"${post.content}"\n\nSeparate each with ---\nWrite ONLY the posts, no labels.`;
    try {
      const raw   = await callClaude(prompt, buildSystem(profile));
      const parts = raw.split(/\n?---+\n?/).map(s => s.trim()).filter(Boolean);
      setPosts(ps => [...parts.map(content => ({ id: nextId(), content, approved: false, source: "More like this", category: post.category, tone: post.tone, pinned: false, posted: false })), ...ps]);
    } catch {}
    setBusy(null);
  }

  function exportApproved() {
    const text = approved.map((p, i) => `[${i + 1}] ${p.source || ""} ${p.category || ""}\n${p.content}\n`).join("\n---\n\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = `devi-threads-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
  }

  return (
    <div>
      <div style={{ background: "#0e0e0e", border: "1px solid #1e1e1e", borderRadius: "14px", padding: "18px 22px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span style={{ fontSize: "11px", color: "#6b7280", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}>
            {approved.length} approved · {posted.length} posted · {profile.monthlyGoal || 30} monthly goal
          </span>
          <span style={{ fontSize: "11px", color: progress >= 100 ? "#34d399" : "#f59e0b", fontFamily: "'DM Mono', monospace" }}>{Math.round(progress)}%</span>
        </div>
        <div style={{ height: "6px", background: "#1e1e1e", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: progress >= 100 ? "#16a34a" : "linear-gradient(90deg, #f59e0b, #ef4444)", borderRadius: "3px", transition: "width 0.5s" }} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          {[["all", `All (${posts.length})`], ["pinned", `📌 (${pinned.length})`], ["queue", `Queue (${queue.length})`], ["approved", `Approved (${approved.length})`], ["posted", `Posted ✓ (${posted.length})`]].map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)} style={{ padding: "5px 12px", borderRadius: "7px", fontSize: "11px", fontFamily: "'DM Mono', monospace", cursor: "pointer", border: "none", background: filter === k ? "#fff" : "#1a1a1a", color: filter === k ? "#000" : "#6b7280", transition: "all 0.15s" }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {queue.length > 0 && <Btn variant="green" onClick={() => setPosts(ps => ps.map(p => !p.posted ? { ...p, approved: true } : p))}>✓ Approve All</Btn>}
          {approved.length > 0 && <Btn variant="green" onClick={exportApproved}>↓ Export {approved.length}</Btn>}
        </div>
      </div>

      {busy === "generating" && (
        <div style={{ background: "#0d1a2e", border: "1px solid #1e3a5f", borderRadius: "10px", padding: "14px 18px", marginBottom: "14px", fontSize: "12px", color: "#60a5fa", fontFamily: "'DM Mono', monospace" }}>
          ✦ Generating more posts like that one…
        </div>
      )}

      {shown.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#2a2a2a" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>◈</div>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px" }}>{posts.length === 0 ? "No posts yet — use Convert or Generate to create some." : "Nothing in this filter."}</p>
        </div>
      ) : shown.map(post => (
        <ThreadPostCard key={post.id} post={post}
          onApprove={approvePost} onEdit={editPost} onRegen={regenPost}
          onDelete={deletePost} onPin={pinPost} onTogglePosted={togglePosted}
          onMoreLikeThis={moreLikeThis} busy={busy === post.id}
          tones={profile.tones?.length ? profile.tones : DEFAULT_TONES}
        />
      ))}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function DeviThreadsMachine() {
  const [tab, setTab]         = useState("profile");
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [posts, setPosts]     = useState([]);
  const [loaded, setLoaded]   = useState(false);
  const [saving, setSaving]   = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      const [p, ps] = await Promise.all([loadStorage("devi_profile"), loadStorage("devi_posts")]);
      if (p)  setProfile({ ...DEFAULT_PROFILE, ...p });
      if (ps) setPosts(ps);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await saveStorage("devi_profile", profile);
      setSaving(true); setTimeout(() => setSaving(false), 2000);
    }, 1000);
  }, [profile, loaded]);

  useEffect(() => { if (loaded) saveStorage("devi_posts", posts); }, [posts, loaded]);

  function addPosts(newPosts) { setPosts(ps => [...newPosts, ...ps]); setTab("library"); }
  const queueCount = posts.filter(p => !p.approved && !p.posted).length;

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#e5e7eb" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,400;0,500;1,400&family=Playfair+Display:wght@600;700&family=Newsreader:ital,wght@0,400;0,500;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea:focus, input:focus, select:focus { outline: none; border-color: #f59e0b !important; }
        button { transition: opacity 0.15s; }
        button:hover:not(:disabled) { opacity: 0.8; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 3px; }
      `}</style>

      <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: "220px", background: "#070707", borderRight: "1px solid #161616", display: "flex", flexDirection: "column", zIndex: 10 }}>
        <div style={{ padding: "28px 24px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "9px", background: "linear-gradient(135deg, #f59e0b, #ef4444)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: 700, color: "#000", fontFamily: "'DM Mono', monospace" }}>D</div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "'Playfair Display', serif", color: "#f9fafb" }}>Devi</div>
              <div style={{ fontSize: "10px", color: "#4b5563", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}>THREADS MACHINE</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "8px 12px" }}>
          {TABS.map(t => {
            const active = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)} style={{ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: "10px", border: "none", cursor: "pointer", background: active ? "#141414" : "transparent", color: active ? "#f9fafb" : "#6b7280", fontSize: "13px", fontFamily: "'DM Mono', monospace", display: "flex", alignItems: "center", gap: "10px", marginBottom: "2px", transition: "all 0.15s", borderLeft: active ? "2px solid #f59e0b" : "2px solid transparent" }}>
                <span style={{ color: active ? "#f59e0b" : "#4b5563", fontSize: "14px" }}>{TAB_ICONS[t]}</span>
                {TAB_LABELS[t]}
                {t === "library" && queueCount > 0 && (
                  <span style={{ marginLeft: "auto", background: "#f59e0b", color: "#000", borderRadius: "20px", fontSize: "10px", padding: "1px 7px", fontFamily: "'DM Mono', monospace" }}>{queueCount}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #141414" }}>
          <div style={{ fontSize: "10px", color: "#2a2a2a", fontFamily: "'DM Mono', monospace" }}>Profile auto-saves ✦ Posts persist</div>
        </div>
      </div>

      <div style={{ marginLeft: "220px", padding: "48px", maxWidth: "900px" }}>
        {!loaded ? <div style={{ color: "#4b5563", fontFamily: "'DM Mono', monospace", fontSize: "13px" }}>Loading…</div> : (
          <>
            {tab === "profile"  && <ProfileTab profile={profile} setProfile={setProfile} saving={saving} />}
            {tab === "convert"  && <ConvertTab profile={profile} addPosts={addPosts} />}
            {tab === "generate" && <GenerateTab profile={profile} addPosts={addPosts} />}
            {tab === "library"  && <LibraryTab posts={posts} setPosts={setPosts} profile={profile} />}
          </>
        )}
      </div>
    </div>
  );
}
