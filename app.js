// ============================================================
//  黙々チャンネル  app.js
// ============================================================
'use strict';

const { useState, useEffect, useRef } = React;

// ────────────────────────────────────────────────────────────
//  定数
// ────────────────────────────────────────────────────────────
const MEMBERS = [
  { id: 'me',       name: '自分',  role: '支配人',  avatar: '👤', isMe: true  },
  { id: 'tanaka',   name: '田中',  role: 'フロント', avatar: '🛎️', isMe: false },
  { id: 'sato',     name: '佐藤',  role: '予約',    avatar: '📋', isMe: false },
  { id: 'yamamoto', name: '山本',  role: '客室',    avatar: '🛏️', isMe: false },
  { id: 'kimura',   name: '木村',  role: '厨房',    avatar: '🍽️', isMe: false },
];
const MEMBER_MAP = Object.fromEntries(MEMBERS.map(m => [m.id, m]));

const AI_TASKS = {
  tanaka: [
    'チェックイン台帳の確認・整理',
    '館内案内資料の準備',
    'フロントカウンターの清掃・整備',
    'チェックアウト処理のまとめ',
    'ゲスト問い合わせ対応メモの作成',
    'アーリーチェックイン客の部屋割り確認',
    '引き継ぎメモの作成',
    '宿泊者アンケートの集計',
    'フロント周辺の整頓',
    'ウェルカムドリンクの補充確認',
  ],
  sato: [
    'じゃらん・楽天の予約データ取込み',
    '重複予約チェックの確認',
    'OTA空室カレンダーの更新',
    '予約変更・キャンセルの処理',
    '先月の予約統計まとめ',
    '自社サイト予約フォームの動作確認',
    '団体予約の詳細確認',
    '繁忙期の料金プラン見直し',
    'じゃらんのクーポン設定確認',
    'レビュー返信の作成',
  ],
  yamamoto: [
    '客室アメニティ在庫チェック',
    'チェックアウト後の客室点検',
    'リネン類の補充・管理',
    '清掃スタッフのシフト確認',
    '客室設備の不具合報告まとめ',
    '布団・寝具の状態確認',
    '清掃チェックリストの更新',
    '客室備品の補充発注',
    '大浴場の清掃状況確認',
    '客室内消耗品の在庫確認',
  ],
  kimura: [
    '夕食メニューの発注リスト作成',
    '食材在庫の確認と発注',
    '朝食バッフェの準備リスト確認',
    'アレルギー対応メニューの確認',
    '調理器具のメンテナンス記録',
    '今週の献立表の最終確認',
    '食材の原価計算',
    '仕入れ業者との打ち合わせメモ',
    '冷蔵庫・冷凍庫の温度チェック',
    '廃棄食材の記録',
  ],
};

// ────────────────────────────────────────────────────────────
//  ユーティリティ
// ────────────────────────────────────────────────────────────
const rand   = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick   = arr  => arr[rand(0, arr.length - 1)];
const fmtHM  = d    => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
const addMin = (d,m) => new Date(d.getTime() + m * 60000);

let _uid = 0;
const uid = () => ++_uid;

// ────────────────────────────────────────────────────────────
//  通知
// ────────────────────────────────────────────────────────────
async function askNotifPerm() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') await Notification.requestPermission();
}

function notify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  navigator.serviceWorker?.ready.then(reg => {
    reg.showNotification(title, {
      body,
      icon: './icons/icon-192.png',
      vibrate: [300, 100, 300, 100, 300],
      tag: 'mokumoku',
    });
  }).catch(() => {
    new Notification(title, { body, icon: './icons/icon-192.png' });
  });
}

// ────────────────────────────────────────────────────────────
//  初期フィード（アプリ起動時に「すでに動いている感」を出す）
// ────────────────────────────────────────────────────────────
function makeInitialFeed() {
  const now = new Date();

  // 田中：35〜25分前に宣言→完了済み
  const t0  = addMin(now, -rand(30, 38));
  const tdl = addMin(t0, rand(20, 28));
  const tTask = pick(AI_TASKS.tanaka);

  // 山本：22〜14分前に宣言→完了済み
  const y0  = addMin(now, -rand(18, 24));
  const ydl = addMin(y0, rand(15, 20));
  const yTask = pick(AI_TASKS.yamamoto);

  // 佐藤：7〜4分前に宣言→まだ作業中
  const s0  = addMin(now, -rand(4, 8));
  const sdl = addMin(s0, rand(22, 35));
  const sTask = pick(AI_TASKS.sato);

  const msgs = [
    { id: uid(), memberId: 'tanaka',   type: 'declare', text: `${tTask}をやります`,
      deadline: fmtHM(tdl), deadlineTs: tdl.getTime(), timeStr: fmtHM(t0),  done: true  },
    { id: uid(), memberId: 'tanaka',   type: 'done',    text: '✅ 完了！',
      deadline: null,        deadlineTs: null,           timeStr: fmtHM(addMin(tdl,-rand(2,6))), done: true },
    { id: uid(), memberId: 'yamamoto', type: 'declare', text: `${yTask}をやります`,
      deadline: fmtHM(ydl), deadlineTs: ydl.getTime(), timeStr: fmtHM(y0),  done: true  },
    { id: uid(), memberId: 'yamamoto', type: 'done',    text: '✅ 完了！',
      deadline: null,        deadlineTs: null,           timeStr: fmtHM(addMin(ydl,-rand(1,4))), done: true },
    { id: uid(), memberId: 'sato',     type: 'declare', text: `${sTask}をやります`,
      deadline: fmtHM(sdl), deadlineTs: sdl.getTime(), timeStr: fmtHM(s0),  done: false },
  ];

  return { msgs, satoDeadlineTs: sdl.getTime() };
}

// ────────────────────────────────────────────────────────────
//  App
// ────────────────────────────────────────────────────────────
function App() {
  const init   = useRef(makeInitialFeed());
  const timers = useRef({});
  const feedEnd = useRef(null);

  const [feed,     setFeed]     = useState(init.current.msgs);
  const [myTask,   setMyTask]   = useState(null);   // {text, deadlineTs, n5, n0}
  const [aiActive, setAiActive] = useState({ sato: true });
  const [showModal, setShowModal] = useState(false);
  const [taskText,  setTaskText]  = useState('');
  const [selMin,    setSelMin]    = useState(30);
  const [now,       setNow]       = useState(new Date());

  // ─── 時計（1秒ごと） ───
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // ─── 通知許可（起動時） ───
  useEffect(() => { askNotifPerm(); }, []);

  // ─── フィード末尾スクロール ───
  useEffect(() => {
    feedEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [feed]);

  // ─── マイタスク 締め切り監視 ───
  useEffect(() => {
    if (!myTask) return;
    const ms = myTask.deadlineTs - now.getTime();
    if (!myTask.n5 && ms <= 5 * 60000 && ms > 0) {
      notify('⏰ あと5分！', `「${myTask.text}」の締め切りまで5分を切りました`);
      setMyTask(t => ({ ...t, n5: true }));
    }
    if (!myTask.n0 && ms <= 0) {
      notify('🔔 締め切り時刻です！', `「${myTask.text}」を完了してください！`);
      setMyTask(t => ({ ...t, n0: true }));
    }
  }, [now, myTask]);

  // ─── AIスケジューラ ───
  useEffect(() => {
    const t = timers.current;

    // 稼働時間：10:00〜22:00
    function isActiveHour() {
      const h = new Date().getHours();
      return h >= 10 && h < 22;
    }

    // 次の10:00までのms（稼働外のとき）
    function msUntilTen() {
      const n = new Date();
      const next = new Date(n);
      if (n.getHours() >= 22) next.setDate(next.getDate() + 1);
      next.setHours(10, 0, 0, 0);
      return next.getTime() - n.getTime();
    }

    function addMsg(msg) { setFeed(prev => [...prev, msg]); }

    function completeAI(memberId) {
      addMsg({ id: uid(), memberId, type: 'done', text: '✅ 完了！',
               deadline: null, deadlineTs: null, timeStr: fmtHM(new Date()), done: true });
      setAiActive(prev => ({ ...prev, [memberId]: false }));
      scheduleAI(memberId, rand(90, 270) * 1000);
    }

    function runAI(memberId) {
      if (!isActiveHour()) {
        // 稼働外なら次の10:00に再スケジュール
        scheduleAI(memberId, msUntilTen() + rand(0, 300) * 1000);
        return;
      }
      const text = pick(AI_TASKS[memberId]);
      const deadlineMin = rand(15, 45);
      const dl = addMin(new Date(), deadlineMin);
      addMsg({ id: uid(), memberId, type: 'declare',
               text: `${text}をやります`,
               deadline: fmtHM(dl), deadlineTs: dl.getTime(),
               timeStr: fmtHM(new Date()), done: false });
      setAiActive(prev => ({ ...prev, [memberId]: true }));
      const completeDelay = Math.max((deadlineMin - rand(2, 8)) * 60000, 60000);
      clearTimeout(t[`${memberId}_c`]);
      t[`${memberId}_c`] = setTimeout(() => completeAI(memberId), completeDelay);
    }

    function scheduleAI(memberId, delay) {
      clearTimeout(t[memberId]);
      // 発火予定時刻が稼働外なら次の10:00に変更
      const fireAt = Date.now() + delay;
      const fireHour = new Date(fireAt).getHours();
      const inRange = fireHour >= 10 && fireHour < 22;
      const actualDelay = inRange ? delay : msUntilTen() + rand(0, 300) * 1000;
      t[memberId] = setTimeout(() => runAI(memberId), actualDelay);
    }

    // 佐藤の現在タスクを締め切り前に完了させる
    const satoMs = init.current.satoDeadlineTs - Date.now();
    if (satoMs > 90000) {
      t['sato_c'] = setTimeout(() => {
        addMsg({ id: uid(), memberId: 'sato', type: 'done', text: '✅ 完了！',
                 deadline: null, deadlineTs: null, timeStr: fmtHM(new Date()), done: true });
        setAiActive(prev => ({ ...prev, sato: false }));
        scheduleAI('sato', rand(90, 180) * 1000);
      }, Math.max(satoMs - rand(2, 6) * 60000, 60000));
    } else {
      // すでに締め切り近い/過ぎている場合はすぐ次へ
      scheduleAI('sato', rand(30, 90) * 1000);
    }

    // 他の3人は1〜5分後にランダム開始
    ['tanaka', 'yamamoto', 'kimura'].forEach(id => {
      scheduleAI(id, rand(60, 300) * 1000);
    });

    return () => Object.values(t).forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── ユーザー：タスク宣言 ───
  const handleDeclare = () => {
    if (!taskText.trim()) return;
    const dl = addMin(new Date(), selMin);
    setFeed(prev => [...prev, {
      id: uid(), memberId: 'me', type: 'declare',
      text: `${taskText.trim()}をやります`,
      deadline: fmtHM(dl), deadlineTs: dl.getTime(),
      timeStr: fmtHM(new Date()), done: false,
    }]);
    setMyTask({ text: taskText.trim(), deadlineTs: dl.getTime(), n5: false, n0: false });
    setTaskText('');
    setSelMin(30);
    setShowModal(false);
  };

  // ─── ユーザー：完了 ───
  const handleComplete = () => {
    setFeed(prev => [...prev, {
      id: uid(), memberId: 'me', type: 'done', text: '✅ 完了！',
      deadline: null, deadlineTs: null, timeStr: fmtHM(new Date()), done: true,
    }]);
    setMyTask(null);
  };

  // ─── ユーザー：中断 ───
  const handleStop = () => {
    setFeed(prev => [...prev, {
      id: uid(), memberId: 'me', type: 'done', text: '⏹ 中断しました',
      deadline: null, deadlineTs: null, timeStr: fmtHM(new Date()), done: true,
    }]);
    setMyTask(null);
  };

  // ─── 派生値 ───
  const countdown = (() => {
    if (!myTask) return null;
    const ms = myTask.deadlineTs - now.getTime();
    if (ms <= 0) return 'TIME UP';
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
  })();

  const isOverdue  = myTask && myTask.deadlineTs < now.getTime();
  const isUrgent   = myTask && !isOverdue && (myTask.deadlineTs - now.getTime()) < 5 * 60000;
  const memberStat = id => id === 'me' ? (myTask ? 'active' : 'idle') : (aiActive[id] ? 'active' : 'idle');
  const SC = { active: '#fbbf24', idle: '#1e3a4a', done: '#4ade80' };

  // ─── スタイル定数 ───
  const font = "'Noto Sans JP', sans-serif";

  return (
    <div style={{
      minHeight: '100svh', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(160deg,#0f1923 0%,#1a2a38 50%,#0f1923 100%)',
      fontFamily: font, color: '#e2e8f0',
      maxWidth: 480, margin: '0 auto', position: 'relative',
    }}>

      {/* 背景グロー */}
      <div style={{
        position: 'fixed', top: -100, right: -100, width: 360, height: 360,
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(circle,rgba(56,189,248,.07) 0%,transparent 70%)',
      }} />

      {/* ════════════════ ヘッダー ════════════════ */}
      <header style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid rgba(255,255,255,.07)',
        background: 'rgba(15,25,35,.92)',
        backdropFilter: 'blur(16px)',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div>
            <div style={{ fontSize:9, letterSpacing:'.18em', color:'#38bdf8', fontWeight:700, marginBottom:2 }}>
              MOKUMOKU CHANNEL
            </div>
            <div style={{ fontSize:18, fontWeight:700 }}>黙々チャンネル</div>
          </div>
          <div style={{
            background:'rgba(56,189,248,.1)', border:'1px solid rgba(56,189,248,.25)',
            borderRadius:10, padding:'5px 12px',
            fontSize:15, color:'#38bdf8', fontWeight:700, fontVariantNumeric:'tabular-nums',
          }}>
            🕐 {fmtHM(now)}
          </div>
        </div>

        {/* アバター一覧 */}
        <div style={{ display:'flex', gap:6 }}>
          {MEMBERS.map(m => {
            const s   = memberStat(m.id);
            const col = SC[s];
            return (
              <div key={m.id} style={{ flex:1, textAlign:'center' }}>
                <div style={{
                  width:40, height:40, borderRadius:'50%', margin:'0 auto 4px',
                  background: m.isMe ? 'linear-gradient(135deg,#0369a1,#0284c7)' : 'rgba(255,255,255,.06)',
                  border:`2.5px solid ${col}`,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
                  boxShadow: s === 'active' ? `0 0 14px ${col}55` : 'none',
                  transition:'border-color .4s, box-shadow .4s',
                }}>
                  {m.avatar}
                </div>
                <div style={{ fontSize:9, color:'#64748b' }}>{m.name}</div>
              </div>
            );
          })}
        </div>
      </header>

      {/* ════════════════ マイタスクバナー ════════════════ */}
      {myTask && (
        <div style={{
          margin:'10px 12px 0', zIndex:5,
          background: isOverdue ? 'rgba(239,68,68,.12)' : isUrgent ? 'rgba(251,191,36,.1)' : 'rgba(14,165,233,.1)',
          border:`1px solid ${isOverdue ? 'rgba(239,68,68,.4)' : isUrgent ? 'rgba(251,191,36,.4)' : 'rgba(14,165,233,.3)'}`,
          borderRadius:14, padding:'10px 14px',
          display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:10, fontWeight:700, marginBottom:2,
              color: isOverdue ? '#ef4444' : isUrgent ? '#fbbf24' : '#38bdf8' }}>
              {isOverdue ? '⚠️ 時間切れ' : isUrgent ? '🔥 あと少し！' : '⏱ 作業中'}
            </div>
            <div style={{ fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {myTask.text}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0, marginLeft:8 }}>
            <div style={{
              fontSize:20, fontWeight:700, fontVariantNumeric:'tabular-nums', minWidth:76, textAlign:'right',
              color: isOverdue ? '#ef4444' : isUrgent ? '#fbbf24' : '#e2e8f0',
            }}>
              {countdown}
            </div>
            <button onClick={handleComplete} style={{
              background:'#22c55e', border:'none', borderRadius:8,
              padding:'7px 13px', color:'#fff', fontSize:12, fontWeight:700,
              fontFamily: font, cursor:'pointer',
            }}>完了</button>
            <button onClick={handleStop} style={{
              background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.15)',
              borderRadius:8, padding:'7px 11px', color:'#94a3b8',
              fontSize:12, fontWeight:700, fontFamily: font, cursor:'pointer',
            }}>中断</button>
          </div>
        </div>
      )}

      {/* ════════════════ フィード ════════════════ */}
      <main style={{
        flex:1, overflowY:'auto',
        padding:`12px 12px ${myTask ? 88 : 108}px`,
      }}>
        {feed.map(item => {
          const m = MEMBER_MAP[item.memberId];

          /* 完了通知（センター表示） */
          if (item.type === 'done') {
            return (
              <div key={item.id} style={{ textAlign:'center', margin:'4px 0 14px' }}>
                <span style={{
                  display:'inline-flex', alignItems:'center', gap:5,
                  fontSize:11, color:'#4ade80', fontWeight:700,
                  background:'rgba(74,222,128,.08)', border:'1px solid rgba(74,222,128,.2)',
                  borderRadius:20, padding:'3px 14px',
                }}>
                  {m.avatar} {m.name} 完了！
                </span>
                <div style={{ fontSize:9, color:'#2a3d4d', marginTop:2 }}>{item.timeStr}</div>
              </div>
            );
          }

          /* 宣言バブル */
          const isMe = m.isMe;
          return (
            <div key={item.id} style={{
              display:'flex', flexDirection: isMe ? 'row-reverse' : 'row',
              gap:8, marginBottom:12, alignItems:'flex-end',
            }}>
              {!isMe && (
                <div style={{
                  width:30, height:30, borderRadius:'50%', flexShrink:0,
                  background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
                }}>
                  {m.avatar}
                </div>
              )}
              <div style={{
                maxWidth:'76%', display:'flex', flexDirection:'column',
                alignItems: isMe ? 'flex-end' : 'flex-start',
              }}>
                {!isMe && (
                  <div style={{ fontSize:9, color:'#64748b', marginBottom:3 }}>
                    {m.name} · {m.role}
                  </div>
                )}
                <div style={{
                  background: isMe ? 'linear-gradient(135deg,#0369a1,#0284c7)' : 'rgba(255,255,255,.06)',
                  border: isMe ? 'none' : '1px solid rgba(255,255,255,.08)',
                  borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding:'9px 12px',
                }}>
                  <div style={{ fontSize:13, lineHeight:1.65, marginBottom: item.deadline ? 7 : 0 }}>
                    {item.text}
                  </div>
                  {item.deadline && (
                    <div style={{
                      display:'inline-flex', alignItems:'center', gap:4,
                      background:'rgba(0,0,0,.22)', borderRadius:8, padding:'3px 9px', fontSize:11,
                    }}>
                      ⏰{' '}
                      <span style={{ fontWeight:700, color: item.done ? '#475569' : '#fbbf24' }}>
                        {item.deadline} まで
                      </span>
                      {item.done && <span style={{ color:'#4ade80' }}>✓</span>}
                    </div>
                  )}
                </div>
                <div style={{ fontSize:9, color:'#2a3d4d', marginTop:2 }}>{item.timeStr}</div>
              </div>
            </div>
          );
        })}
        <div ref={feedEnd} />
      </main>

      {/* ════════════════ 宣言ボタン ════════════════ */}
      <div style={{
        position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
        width:'100%', maxWidth:480,
        padding:'10px 16px 32px',
        background:'linear-gradient(to top,#0f1923 55%,transparent)',
        zIndex:15,
      }}>
        {myTask
          ? <div style={{ textAlign:'center', fontSize:11, color:'#334155', padding:'10px 0' }}>
              作業完了後に次のタスクを宣言できます
            </div>
          : <button onClick={() => setShowModal(true)} style={{
              width:'100%', border:'none', borderRadius:16, padding:15,
              background:'linear-gradient(135deg,#0ea5e9,#0284c7)',
              color:'#fff', fontSize:15, fontWeight:700,
              fontFamily: font, cursor:'pointer',
              boxShadow:'0 4px 20px rgba(14,165,233,.35)',
            }}>
              ＋ タスクを宣言する
            </button>
        }
      </div>

      {/* ════════════════ 宣言モーダル ════════════════ */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position:'fixed', inset:0, zIndex:50,
            background:'rgba(0,0,0,.65)', backdropFilter:'blur(4px)',
            display:'flex', alignItems:'flex-end',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width:'100%', maxWidth:480, margin:'0 auto',
              background:'#1a2a38', borderRadius:'24px 24px 0 0',
              padding:'24px 20px 48px',
              border:'1px solid rgba(255,255,255,.1)',
            }}
          >
            <div style={{ width:36, height:4, background:'rgba(255,255,255,.15)', borderRadius:2, margin:'0 auto 20px' }} />
            <div style={{ fontSize:16, fontWeight:700, marginBottom:20, textAlign:'center' }}>
              タスクを宣言する
            </div>

            {/* タスク入力 */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10, color:'#38bdf8', fontWeight:700, marginBottom:8, letterSpacing:'.1em' }}>TASK</div>
              <textarea
                value={taskText}
                onChange={e => setTaskText(e.target.value)}
                placeholder="何をやりますか？"
                rows={2}
                style={{
                  width:'100%', minHeight:72,
                  background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.15)',
                  borderRadius:12, padding:'12px 14px',
                  fontSize:14, color:'#e2e8f0', fontFamily: font,
                  resize:'none', outline:'none',
                }}
              />
            </div>

            {/* 時間選択 */}
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:10, color:'#38bdf8', fontWeight:700, marginBottom:8, letterSpacing:'.1em' }}>
                DEADLINE（最大60分）
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {[15, 30, 45, 60].map(m => (
                  <button key={m} onClick={() => setSelMin(m)} style={{
                    flex:1, padding:'10px 0',
                    background: selMin === m ? 'rgba(14,165,233,.2)' : 'rgba(255,255,255,.04)',
                    border:`1px solid ${selMin === m ? '#0ea5e9' : 'rgba(255,255,255,.1)'}`,
                    borderRadius:10, fontSize:13,
                    color: selMin === m ? '#38bdf8' : '#64748b',
                    fontWeight: selMin === m ? 700 : 400,
                    fontFamily: font, cursor:'pointer',
                  }}>{m}分</button>
                ))}
              </div>
              <div style={{ fontSize:10, color:'#475569', marginTop:8, textAlign:'right' }}>
                締め切り：{fmtHM(addMin(now, selMin))}
              </div>
            </div>

            <button
              onClick={handleDeclare}
              disabled={!taskText.trim()}
              style={{
                width:'100%', border:'none', borderRadius:14, padding:14,
                background: taskText.trim() ? 'linear-gradient(135deg,#0ea5e9,#0284c7)' : 'rgba(255,255,255,.1)',
                color:'#fff', fontSize:15, fontWeight:700, fontFamily: font,
                cursor: taskText.trim() ? 'pointer' : 'not-allowed',
                opacity: taskText.trim() ? 1 : 0.5,
                transition:'opacity .2s',
              }}
            >
              宣言する 🔔
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
