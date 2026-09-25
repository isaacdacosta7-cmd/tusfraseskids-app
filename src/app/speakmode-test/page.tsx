'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Choice = { label: string; value: string };
type QuizQuestion = {
  id: string;
  prompt: string;
  choices: Choice[];
  correct: string;
  weight: number;
};

const listeningQuestions: QuizQuestion[] = [
  {
    id: 'l1',
    prompt: 'What time will the speaker probably arrive?',
    choices: [
      { label: 'Around 6:45', value: 'a' },
      { label: 'Around 7:15', value: 'b' },
      { label: 'Around 7:50', value: 'c' },
    ],
    correct: 'b',
    weight: 7,
  },
  {
    id: 'l2',
    prompt: 'What should the other person do first?',
    choices: [
      { label: 'Order dinner', value: 'a' },
      { label: 'Wait outside', value: 'b' },
      { label: 'Get a table near the window', value: 'c' },
    ],
    correct: 'c',
    weight: 7,
  },
  {
    id: 'l3',
    prompt: 'Why is the speaker very hungry?',
    choices: [
      { label: "They haven't eaten all day", value: 'a' },
      { label: 'They just finished exercising', value: 'b' },
      { label: 'Dinner was cancelled', value: 'c' },
    ],
    correct: 'a',
    weight: 7,
  },
  {
    id: 'l4',
    prompt: 'How often does the second speaker go to the office now?',
    choices: [
      { label: 'Every day', value: 'a' },
      { label: 'Three times a week', value: 'b' },
      { label: 'Once a month', value: 'c' },
    ],
    correct: 'b',
    weight: 7,
  },
  {
    id: 'l5',
    prompt: 'Which part of going to the office does the speaker dislike?',
    choices: [
      { label: 'Seeing coworkers', value: 'a' },
      { label: 'Working in person', value: 'b' },
      { label: 'The commute', value: 'c' },
    ],
    correct: 'c',
    weight: 7,
  },
];

const reactionQuestions: QuizQuestion[] = [
  {
    id: 'r1',
    prompt: '"Hey! How’s it going?"',
    choices: [
      { label: 'Pretty good, just a bit tired. You?', value: 'a' },
      { label: 'I am going to my house.', value: 'b' },
      { label: 'My name is Laura.', value: 'c' },
    ],
    correct: 'a',
    weight: 5,
  },
  {
    id: 'r2',
    prompt: '"Do you mind if I sit here?"',
    choices: [
      { label: 'Yes, I am sitting.', value: 'a' },
      { label: 'Go ahead.', value: 'b' },
      { label: 'I don’t know where.', value: 'c' },
    ],
    correct: 'b',
    weight: 5,
  },
  {
    id: 'r3',
    prompt: '"I haven’t seen you in ages!"',
    choices: [
      { label: 'I know! It’s been forever.', value: 'a' },
      { label: 'I saw you tomorrow.', value: 'b' },
      { label: 'I have 28 years.', value: 'c' },
    ],
    correct: 'a',
    weight: 5,
  },
  {
    id: 'r4',
    prompt: '"So, what do you do?"',
    choices: [
      { label: 'I do every day.', value: 'a' },
      { label: 'I run a small business.', value: 'b' },
      { label: 'I’m doing good.', value: 'c' },
    ],
    correct: 'b',
    weight: 5,
  },
  {
    id: 'r5',
    prompt: '"Could you give me a hand with this?"',
    choices: [
      { label: 'Sure. What do you need?', value: 'a' },
      { label: 'My hand is here.', value: 'b' },
      { label: 'I have two hands.', value: 'c' },
    ],
    correct: 'a',
    weight: 5,
  },
];

const naturalQuestions: QuizQuestion[] = [
  {
    id: 'n1',
    prompt: 'Someone says: “I’ll get back to you.” What do they mean?',
    choices: [
      { label: 'I’ll contact you later.', value: 'a' },
      { label: 'I’m going back home.', value: 'b' },
      { label: 'Stand behind me.', value: 'c' },
    ],
    correct: 'a',
    weight: 4,
  },
  {
    id: 'n2',
    prompt: '“That works for me.” usually means…',
    choices: [
      { label: 'I have a job.', value: 'a' },
      { label: 'That plan or time is fine for me.', value: 'b' },
      { label: 'I need to work now.', value: 'c' },
    ],
    correct: 'b',
    weight: 4,
  },
  {
    id: 'n3',
    prompt: 'You didn’t understand the last sentence. Which response sounds natural?',
    choices: [
      { label: 'I didn’t catch that. Could you say it again?', value: 'a' },
      { label: 'Repeat the phrase immediately.', value: 'b' },
      { label: 'I am not listening your words.', value: 'c' },
    ],
    correct: 'a',
    weight: 4,
  },
  {
    id: 'n4',
    prompt: 'A friend asks: “What have you been up to?” They want to know…',
    choices: [
      { label: 'What you have been doing lately.', value: 'a' },
      { label: 'How tall you are.', value: 'b' },
      { label: 'Where you are standing.', value: 'c' },
    ],
    correct: 'a',
    weight: 4,
  },
  {
    id: 'n5',
    prompt: 'You want to correct one detail politely. Which opening sounds natural?',
    choices: [
      { label: 'Actually, it was on Thursday.', value: 'a' },
      { label: 'In actuality of Thursday.', value: 'b' },
      { label: 'Realmente of Thursday.', value: 'c' },
    ],
    correct: 'a',
    weight: 4,
  },
];

const clips = [
  "Hey, I’m running a little late. I should be there around seven fifteen. If you get there first, just grab us a table near the window. I haven’t eaten all day, so I’m starving.",
  "I used to work from home every day, but now I go into the office three times a week. Honestly, I thought I’d hate it, but I actually like seeing people again. The commute is the only part I could live without.",
];

const steps = ['intro', 'listening', 'reaction', 'natural', 'speaking', 'results'] as const;
type Step = (typeof steps)[number];

const levelFromScore = (score: number) => {
  if (score >= 88) return { level: 'C6 · Advanced Conversation', note: 'You process everyday English quickly and respond with strong conversational control.' };
  if (score >= 75) return { level: 'C5 · Independent', note: 'You can handle common conversations with good speed and flexibility.' };
  if (score >= 60) return { level: 'C4 · Conversational', note: 'You understand the main message and can keep many everyday conversations moving.' };
  if (score >= 45) return { level: 'C3 · Functional', note: 'You can manage familiar situations and already have useful conversational building blocks.' };
  if (score >= 30) return { level: 'C2 · Survival', note: 'You can recognize and use essential conversational English in predictable situations.' };
  return { level: 'C1 · Starter', note: 'Your starting point is clear. The first training block will focus on listening, reaction and core conversation patterns.' };
};

export default function SpeakModeTestPage() {
  const [step, setStep] = useState<Step>('intro');
  const [name, setName] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(15 * 60);
  const [started, setStarted] = useState(false);
  const [plays, setPlays] = useState([0, 0]);
  const [recordingIndex, setRecordingIndex] = useState<number | null>(null);
  const [recordings, setRecordings] = useState<(Blob | null)[]>([null, null]);
  const [micError, setMicError] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const allAutoQuestions = useMemo(
    () => [...listeningQuestions, ...reactionQuestions, ...naturalQuestions],
    []
  );

  const rawScore = useMemo(
    () => allAutoQuestions.reduce((sum, q) => sum + (answers[q.id] === q.correct ? q.weight : 0), 0),
    [answers, allAutoQuestions]
  );

  const provisionalScore = Math.round((rawScore / 80) * 100);
  const level = levelFromScore(provisionalScore);

  useEffect(() => {
    if (!started || step === 'results') return;
    if (secondsLeft <= 0) {
      setStep('results');
      return;
    }
    const timer = window.setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearInterval(timer);
  }, [started, secondsLeft, step]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const formatTime = (value: number) => {
    const m = Math.floor(value / 60).toString().padStart(2, '0');
    const s = (value % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const go = (next: Step) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep(next);
  };

  const playClip = (index: number) => {
    if (plays[index] >= 2 || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clips[index]);
    u.lang = 'en-US';
    u.rate = 1.04;
    u.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) => v.lang === 'en-US') || voices.find((v) => v.lang.startsWith('en'));
    if (preferred) u.voice = preferred;
    window.speechSynthesis.speak(u);
    setPlays((p) => p.map((n, i) => (i === index ? n + 1 : n)));
  };

  const startRecording = async (index: number) => {
    try {
      setMicError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setRecordings((prev) => prev.map((item, i) => (i === index ? blob : item)));
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecordingIndex(null);
      };
      recorder.start();
      setRecordingIndex(index);
      window.setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 45000);
    } catch {
      setMicError('Microphone access is unavailable in this browser. You can continue and send Isaac the two voice answers separately.');
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const recordingUrl = (blob: Blob | null) => (blob ? URL.createObjectURL(blob) : '');

  const downloadRecording = (index: number) => {
    const blob = recordings[index];
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `speakmode-${name.trim().replace(/\s+/g, '-').toLowerCase() || 'student'}-voice-${index + 1}.webm`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const shareResult = async () => {
    const text = `SpeakMode English · Conversation Check\nStudent: ${name || 'Student'}\nAutomatic score: ${rawScore}/80\nProvisional score: ${provisionalScore}/100\nLevel: ${level.level}\nVoice review: pending`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'SpeakMode English Result', text });
        return;
      } catch {}
    }
    await navigator.clipboard?.writeText(text);
    alert('Result copied to clipboard.');
  };

  const renderQuestion = (q: QuizQuestion) => (
    <div className="question" key={q.id}>
      <p className="questionText">{q.prompt}</p>
      <div className="choices">
        {q.choices.map((choice) => {
          const selected = answers[q.id] === choice.value;
          return (
            <button
              type="button"
              key={choice.value}
              className={`choice ${selected ? 'selected' : ''}`}
              onClick={() => setAnswers((a) => ({ ...a, [q.id]: choice.value }))}
            >
              <span className="choiceDot">{selected ? '✓' : ''}</span>
              <span>{choice.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const sectionAnswered = (questions: QuizQuestion[]) => questions.every((q) => Boolean(answers[q.id]));
  const progressIndex = Math.max(0, steps.indexOf(step));
  const progress = Math.min(100, Math.round((progressIndex / (steps.length - 1)) * 100));

  return (
    <main className="shell">
      <div className="topbar">
        <div className="brand">
          <span className="mark">S</span>
          <div>
            <strong>SpeakMode</strong>
            <small>ENGLISH</small>
          </div>
        </div>
        {started && step !== 'results' && <div className="timer">{formatTime(secondsLeft)}</div>}
      </div>

      <div className="progressTrack"><div className="progressBar" style={{ width: `${progress}%` }} /></div>

      {step === 'intro' && (
        <section className="hero card">
          <div className="eyebrow">15-MINUTE CONVERSATION CHECK</div>
          <h1>How ready are you to <span>speak English?</span></h1>
          <p className="lead">
            This short check measures how you understand spoken English, react in real conversations,
            recognize natural expressions and express yourself out loud.
          </p>
          <div className="metricRow">
            <div><b>15</b><span>minutes</span></div>
            <div><b>4</b><span>skills</span></div>
            <div><b>2</b><span>voice challenges</span></div>
          </div>
          <label className="fieldLabel" htmlFor="name">Your name</label>
          <input
            id="name"
            className="nameInput"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Type your name"
            autoComplete="name"
          />
          <button
            className="primary"
            disabled={!name.trim()}
            onClick={() => {
              setStarted(true);
              setSecondsLeft(15 * 60);
              go('listening');
            }}
          >
            Start my conversation check
          </button>
          <p className="micro">Use headphones if possible. Allow microphone access for the final voice challenges.</p>
        </section>
      )}

      {step === 'listening' && (
        <section className="card">
          <div className="sectionHead">
            <span>01</span>
            <div><p>LISTENING</p><h2>Catch the message.</h2></div>
          </div>
          <p className="instruction">Listen naturally. Each clip can be played twice.</p>

          <div className="audioCard">
            <div><small>CLIP 1</small><strong>Late for dinner</strong></div>
            <button className="audioButton" onClick={() => playClip(0)} disabled={plays[0] >= 2}>
              {plays[0] >= 2 ? '2/2 plays used' : `▶ Play audio · ${plays[0]}/2`}
            </button>
          </div>
          {listeningQuestions.slice(0, 3).map(renderQuestion)}

          <div className="audioCard second">
            <div><small>CLIP 2</small><strong>Back at the office</strong></div>
            <button className="audioButton" onClick={() => playClip(1)} disabled={plays[1] >= 2}>
              {plays[1] >= 2 ? '2/2 plays used' : `▶ Play audio · ${plays[1]}/2`}
            </button>
          </div>
          {listeningQuestions.slice(3).map(renderQuestion)}

          <button className="primary" disabled={!sectionAnswered(listeningQuestions)} onClick={() => go('reaction')}>
            Continue
          </button>
        </section>
      )}

      {step === 'reaction' && (
        <section className="card">
          <div className="sectionHead">
            <span>02</span>
            <div><p>REACTION</p><h2>What would you say?</h2></div>
          </div>
          <p className="instruction">Choose the response that feels most natural in a real conversation. Trust your first reaction.</p>
          {reactionQuestions.map(renderQuestion)}
          <button className="primary" disabled={!sectionAnswered(reactionQuestions)} onClick={() => go('natural')}>
            Continue
          </button>
        </section>
      )}

      {step === 'natural' && (
        <section className="card">
          <div className="sectionHead">
            <span>03</span>
            <div><p>REAL ENGLISH</p><h2>Understand the phrase.</h2></div>
          </div>
          <p className="instruction">Pick the meaning or response you would use during an everyday conversation.</p>
          {naturalQuestions.map(renderQuestion)}
          <button className="primary" disabled={!sectionAnswered(naturalQuestions)} onClick={() => go('speaking')}>
            Go to voice challenges
          </button>
        </section>
      )}

      {step === 'speaking' && (
        <section className="card">
          <div className="sectionHead">
            <span>04</span>
            <div><p>SPEAKING</p><h2>Now use your English.</h2></div>
          </div>
          <p className="instruction">Speak naturally. Aim for 30–45 seconds. Isaac will use these answers to complete your placement.</p>

          {[
            {
              title: 'Voice challenge 1',
              prompt: 'You just met someone at an international event. Introduce yourself: your name, what you do and something you are working on right now.',
            },
            {
              title: 'Voice challenge 2',
              prompt: 'Someone asks: “So, what have you been working on lately?” Answer naturally and finish by asking that person one follow-up question.',
            },
          ].map((item, index) => {
            const blob = recordings[index];
            return (
              <div className="voiceCard" key={item.title}>
                <div className="voiceNumber">0{index + 1}</div>
                <div className="voiceContent">
                  <small>{item.title}</small>
                  <p>{item.prompt}</p>
                  <div className="voiceActions">
                    {recordingIndex === index ? (
                      <button className="record active" onClick={stopRecording}>■ Stop recording</button>
                    ) : (
                      <button className="record" onClick={() => startRecording(index)}>
                        {blob ? '↻ Record again' : '● Start recording'}
                      </button>
                    )}
                    {blob && <audio controls src={recordingUrl(blob)} />}
                  </div>
                </div>
              </div>
            );
          })}

          {micError && <div className="notice">{micError}</div>}
          <button className="primary" onClick={() => go('results')}>
            See my result
          </button>
        </section>
      )}

      {step === 'results' && (
        <section className="card resultCard">
          <div className="eyebrow">SPEAKMODE CONVERSATION CHECK</div>
          <p className="hello">Nice work, {name || 'there'}.</p>
          <div className="scoreCircle">
            <strong>{provisionalScore}</strong>
            <span>/100 provisional</span>
          </div>
          <h1 className="resultLevel">{level.level}</h1>
          <p className="resultNote">{level.note}</p>

          <div className="scoreGrid">
            <div><span>Automatic section</span><b>{rawScore}/80</b></div>
            <div><span>Voice review</span><b>Pending /20</b></div>
          </div>

          <div className="nextBox">
            <small>NEXT STEP</small>
            <h3>Send your result and your voice answers to Isaac.</h3>
            <p>Your final placement combines this score with clarity, response speed, fluency and conversation control in the two voice challenges.</p>
          </div>

          <div className="resultActions">
            <button className="primary" onClick={shareResult}>Share / copy my result</button>
            {recordings.map((blob, index) =>
              blob ? (
                <button className="secondary" key={index} onClick={() => downloadRecording(index)}>
                  Download voice {index + 1}
                </button>
              ) : null
            )}
          </div>

          <p className="micro">SpeakMode English · Conversation is a skill. Train it.</p>
        </section>
      )}

      <footer>
        <span>SpeakMode English</span>
        <span>Conversation Check · Pilot 01</span>
      </footer>

      <style jsx>{`
        :global(*){box-sizing:border-box}
        :global(body){margin:0;background:#f5f5ef;color:#111318;font-family:Arial,Helvetica,sans-serif}
        button,input{font:inherit}
        .shell{min-height:100vh;padding:28px 18px 44px;background:
          radial-gradient(circle at 85% 5%,rgba(104,115,255,.14),transparent 30%),
          radial-gradient(circle at 10% 30%,rgba(216,255,89,.13),transparent 26%),
          #f5f5ef}
        .topbar{max-width:840px;margin:0 auto 16px;display:flex;align-items:center;justify-content:space-between}
        .brand{display:flex;gap:10px;align-items:center}
        .mark{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:#111318;color:#d8ff59;font-weight:900}
        .brand strong{display:block;font-size:16px;letter-spacing:-.02em}
        .brand small{display:block;font-size:8px;letter-spacing:.22em;color:#6d7077;margin-top:2px}
        .timer{background:#111318;color:white;padding:10px 14px;border-radius:999px;font-weight:800;font-variant-numeric:tabular-nums}
        .progressTrack{max-width:840px;height:4px;background:#dedfd8;border-radius:99px;margin:0 auto 20px;overflow:hidden}
        .progressBar{height:100%;background:#6570ff;transition:width .35s ease}
        .card{max-width:840px;margin:0 auto;background:rgba(255,255,255,.94);border:1px solid #e1e2da;border-radius:28px;padding:clamp(24px,5vw,54px);box-shadow:0 24px 80px rgba(20,22,30,.07)}
        .hero{padding-top:60px;padding-bottom:54px}
        .eyebrow{display:inline-flex;padding:9px 12px;border-radius:999px;background:#d8ff59;font-size:11px;font-weight:900;letter-spacing:.12em}
        h1{font-size:clamp(42px,8vw,76px);line-height:.95;letter-spacing:-.06em;margin:22px 0 22px;max-width:720px}
        h1 span{color:#6570ff}
        .lead{font-size:clamp(17px,2.4vw,21px);line-height:1.55;color:#555a63;max-width:650px}
        .metricRow{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:34px 0}
        .metricRow div{background:#f5f5ef;border-radius:18px;padding:18px}
        .metricRow b{display:block;font-size:30px;letter-spacing:-.04em}
        .metricRow span{font-size:12px;color:#6d7077}
        .fieldLabel{display:block;font-size:12px;font-weight:800;margin:28px 0 8px}
        .nameInput{width:100%;border:1px solid #d9dad3;background:white;border-radius:16px;padding:17px 18px;outline:none;font-size:17px}
        .nameInput:focus{border-color:#6570ff;box-shadow:0 0 0 4px rgba(101,112,255,.1)}
        .primary,.secondary,.audioButton,.record{border:0;cursor:pointer;border-radius:16px;font-weight:800;transition:.2s ease}
        .primary{width:100%;padding:17px 20px;background:#111318;color:white;margin-top:18px}
        .primary:hover{transform:translateY(-1px);background:#242730}
        .primary:disabled{opacity:.35;cursor:not-allowed;transform:none}
        .micro{font-size:11px;line-height:1.45;color:#858990;text-align:center;margin:16px 0 0}
        .sectionHead{display:flex;gap:16px;align-items:center;margin-bottom:12px}
        .sectionHead>span{display:grid;place-items:center;width:52px;height:52px;border-radius:16px;background:#111318;color:#d8ff59;font-weight:900}
        .sectionHead p{font-size:10px;letter-spacing:.15em;font-weight:900;margin:0 0 3px;color:#737780}
        .sectionHead h2{font-size:30px;letter-spacing:-.04em;margin:0}
        .instruction{color:#656a72;line-height:1.5;margin:12px 0 28px}
        .audioCard{display:flex;align-items:center;justify-content:space-between;gap:16px;background:#111318;color:white;border-radius:20px;padding:18px 20px;margin:22px 0}
        .audioCard.second{margin-top:38px}
        .audioCard small{display:block;color:#d8ff59;font-size:9px;letter-spacing:.14em;font-weight:900}
        .audioCard strong{display:block;margin-top:4px}
        .audioButton{background:#fff;color:#111318;padding:12px 14px;white-space:nowrap}
        .audioButton:disabled{opacity:.55;cursor:default}
        .question{padding:20px 0;border-bottom:1px solid #ecece6}
        .questionText{font-size:18px;line-height:1.42;font-weight:800;margin:0 0 13px}
        .choices{display:grid;gap:9px}
        .choice{width:100%;display:flex;align-items:center;gap:12px;text-align:left;border:1px solid #dedfd9;background:#fafaf7;border-radius:14px;padding:13px 14px;cursor:pointer;color:#25282d}
        .choice:hover{border-color:#b7bbff}
        .choice.selected{border-color:#6570ff;background:#f0f1ff}
        .choiceDot{width:24px;height:24px;border-radius:999px;border:1px solid #cfd0ca;display:grid;place-items:center;font-size:12px;font-weight:900;flex:0 0 auto}
        .selected .choiceDot{background:#6570ff;color:white;border-color:#6570ff}
        .voiceCard{display:flex;gap:16px;padding:22px 0;border-bottom:1px solid #e7e8e1}
        .voiceNumber{font-size:12px;font-weight:900;color:#6570ff;padding-top:4px}
        .voiceContent{flex:1}
        .voiceContent small{font-weight:900;letter-spacing:.08em;color:#737780}
        .voiceContent p{font-size:18px;line-height:1.5;font-weight:700;margin:8px 0 15px}
        .voiceActions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
        .record{padding:12px 15px;background:#111318;color:white}
        .record.active{background:#ea4e58}
        audio{height:38px;max-width:100%}
        .notice{margin:18px 0;background:#fff3c8;border:1px solid #efd98b;padding:13px 15px;border-radius:14px;font-size:13px;line-height:1.4}
        .resultCard{text-align:center}
        .hello{font-size:18px;color:#666b73;margin:24px 0 16px}
        .scoreCircle{width:190px;height:190px;margin:10px auto 24px;border-radius:50%;display:grid;place-items:center;align-content:center;background:#111318;color:white;box-shadow:inset 0 0 0 10px #262a31}
        .scoreCircle strong{font-size:70px;line-height:1;letter-spacing:-.06em;color:#d8ff59}
        .scoreCircle span{font-size:11px;color:#b9bcc3;margin-top:6px}
        .resultLevel{font-size:clamp(34px,6vw,52px);line-height:1;margin:12px auto;max-width:660px}
        .resultNote{max-width:600px;margin:0 auto;color:#62666d;line-height:1.55;font-size:16px}
        .scoreGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:30px 0}
        .scoreGrid div{background:#f5f5ef;padding:18px;border-radius:16px;text-align:left}
        .scoreGrid span{display:block;font-size:11px;color:#777b83;margin-bottom:6px}
        .scoreGrid b{font-size:20px}
        .nextBox{text-align:left;background:#eef0ff;border:1px solid #d7dafe;border-radius:20px;padding:22px;margin:28px 0}
        .nextBox small{font-size:9px;letter-spacing:.15em;font-weight:900;color:#6570ff}
        .nextBox h3{font-size:22px;letter-spacing:-.03em;margin:7px 0}
        .nextBox p{color:#5f6470;line-height:1.5;margin:0}
        .resultActions{display:grid;gap:10px}
        .resultActions .primary{margin-top:0}
        .secondary{width:100%;padding:15px 18px;background:#f5f5ef;border:1px solid #d9dad3;color:#111318}
        footer{max-width:840px;margin:18px auto 0;display:flex;justify-content:space-between;color:#8a8e95;font-size:10px;padding:0 4px}
        @media(max-width:620px){
          .shell{padding:16px 10px 30px}
          .card{border-radius:22px;padding:24px 18px}
          .hero{padding-top:38px}
          .metricRow{grid-template-columns:1fr 1fr 1fr}
          .metricRow div{padding:12px}
          .metricRow b{font-size:24px}
          .audioCard{align-items:flex-start;flex-direction:column}
          .audioButton{width:100%}
          .scoreGrid{grid-template-columns:1fr}
          footer{padding:0 8px}
        }
      `}</style>
    </main>
  );
}
