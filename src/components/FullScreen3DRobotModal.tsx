import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Send,
  Volume2,
  X,
} from 'lucide-react';
import { ThreeRobotStage, type RobotState } from './ThreeRobotStage';
import { speakWithGeminiTTS, stopSpeaking } from '../utils/ttsPlayer';
import type { GradeLevel, Student } from '../types/school';

const MODEL_OPTIONS = [
  { id: 'gemini-3.1-flash-lite', label: 'Fast Buddy (3.1-Flash-Lite)' },
  { id: 'gemini-4-hydrogen', label: 'School Assistant (4-Hydrogen)' },
  { id: 'gemini-4-carbon', label: 'Deep Tutor (4-Carbon · Paid Key)' },
  { id: 'gemini-4-neon', label: 'Interactive Coach (4-Neon · Paid Key)' },
] as const;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToInt16Array(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

function downsampleTo16k(input: Float32Array, sourceRate: number): Float32Array {
  if (sourceRate === 16000 || sourceRate <= 0) {
    return input;
  }
  const ratio = sourceRate / 16000;
  const outputLength = Math.max(1, Math.floor(input.length / ratio));
  const output = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const s0 = input[idx] ?? 0;
    const s1 = input[Math.min(idx + 1, input.length - 1)] ?? s0;
    output[i] = s0 + (s1 - s0) * frac;
  }
  return output;
}

export function FullScreen3DRobotModal({
  isOpen,
  onClose,
  activeStudent,
  activeGrade,
}: {
  isOpen: boolean;
  onClose: () => void;
  activeStudent: Student | undefined;
  activeGrade: GradeLevel;
}) {
  const [robotState, setRobotState] = useState<RobotState>('idle');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.1-flash-lite');
  const [question, setQuestion] = useState('');
  const [latestReply, setLatestReply] = useState<string>(
    'Tap Start Live Voice to talk directly with me, or type a homework or timetable question below!'
  );
  const [inputTranscript, setInputTranscript] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  // Live API (gemini-3.8-live) state
  const [liveActive, setLiveActive] = useState(false);
  const [liveConnecting, setLiveConnecting] = useState(false);

  // Voice Note Transcribe (gemini-3.5-transcribe) state
  const [isRecordingNote, setIsRecordingNote] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const liveActiveRef = useRef<boolean>(false);
  const liveConnectingRef = useRef<boolean>(false);

  const noteRecorderRef = useRef<MediaRecorder | null>(null);
  const noteChunksRef = useRef<Blob[]>([]);
  const speechRecRef = useRef<{ stop: () => void } | null>(null);

  const stopScheduledAudio = useCallback(() => {
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
      } catch {
        // Ignore already stopped source
      }
    }
    activeSourcesRef.current.clear();
    if (outputCtxRef.current) {
      nextStartTimeRef.current = outputCtxRef.current.currentTime;
    } else {
      nextStartTimeRef.current = 0;
    }
  }, []);

  const teardownLiveSession = useCallback(() => {
    liveActiveRef.current = false;
    liveConnectingRef.current = false;
    setLiveActive(false);
    setLiveConnecting(false);
    stopScheduledAudio();

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (inputCtxRef.current) {
      void inputCtxRef.current.close().catch(() => undefined);
      inputCtxRef.current = null;
    }
    if (outputCtxRef.current) {
      void outputCtxRef.current.close().catch(() => undefined);
      outputCtxRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // Ignore close error
      }
      wsRef.current = null;
    }
    setRobotState('idle');
  }, [stopScheduledAudio]);

  useEffect(() => {
    if (!isOpen) {
      teardownLiveSession();
      stopSpeaking();
      if (noteRecorderRef.current && noteRecorderRef.current.state !== 'inactive') {
        noteRecorderRef.current.stop();
      }
    }
  }, [isOpen, teardownLiveSession]);

  useEffect(() => {
    return () => {
      teardownLiveSession();
    };
  }, [teardownLiveSession]);

  const schedulePcmPlayback = useCallback((base64Audio: string) => {
    if (!outputCtxRef.current) {
      outputCtxRef.current = new AudioContext({ sampleRate: 24000 });
      nextStartTimeRef.current = outputCtxRef.current.currentTime;
    }
    const ctx = outputCtxRef.current;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const pcm16 = base64ToInt16Array(base64Audio);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768;
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const startTime = Math.max(ctx.currentTime + 0.02, nextStartTimeRef.current);
    source.start(startTime);
    nextStartTimeRef.current = startTime + audioBuffer.duration;

    activeSourcesRef.current.add(source);
    setRobotState('speaking');
    source.onended = () => {
      activeSourcesRef.current.delete(source);
      if (activeSourcesRef.current.size === 0 && liveActiveRef.current) {
        setRobotState('listening');
      }
    };
  }, []);

  const startLiveVoiceSession = async () => {
    if (liveActive || liveConnecting) {
      teardownLiveSession();
      return;
    }

    setStatusError(null);
    setInputTranscript('');
    liveConnectingRef.current = true;
    setLiveConnecting(true);
    setRobotState('thinking');

    try {
      stopSpeaking();
      // Unlock 24kHz playback AudioContext inside the direct user click gesture
      if (!outputCtxRef.current) {
        outputCtxRef.current = new AudioContext({ sampleRate: 24000 });
        nextStartTimeRef.current = outputCtxRef.current.currentTime;
      }
      if (outputCtxRef.current.state === 'suspended') {
        await outputCtxRef.current.resume();
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone requires HTTPS or opening the app link in its own browser tab.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      micStreamRef.current = stream;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live?studentId=${encodeURIComponent(
        activeStudent?.id || ''
      )}&grade=${encodeURIComponent(activeGrade)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            ready?: boolean;
            audio?: string;
            inputTranscript?: string;
            outputTranscript?: string;
            interrupted?: boolean;
            turnComplete?: boolean;
            error?: string;
          };

          if (msg.error) {
            setStatusError(msg.error);
            teardownLiveSession();
            return;
          }
          if (msg.ready) {
            liveConnectingRef.current = false;
            liveActiveRef.current = true;
            setLiveActive(true);
            setLiveConnecting(false);
            setRobotState('listening');
            setLatestReply("I'm listening live! Go ahead and ask your question.");
          }
          if (msg.interrupted) {
            stopScheduledAudio();
            setRobotState('listening');
          }
          if (msg.inputTranscript) {
            setInputTranscript((prev) => `${prev} ${msg.inputTranscript}`.trim().slice(-140));
          }
          if (msg.outputTranscript) {
            setLatestReply((prev) =>
              prev.startsWith("I'm listening live!")
                ? msg.outputTranscript!
                : `${prev} ${msg.outputTranscript}`.trim().slice(-240)
            );
          }
          if (msg.audio) {
            schedulePcmPlayback(msg.audio);
          }
          if (msg.turnComplete && activeSourcesRef.current.size === 0) {
            setRobotState('listening');
          }
        } catch {
          // Ignore invalid JSON
        }
      };

      ws.onerror = () => {
        setStatusError('Could not connect to Gemini Live voice stream.');
        teardownLiveSession();
      };

      ws.onclose = () => {
        const wasPending = liveConnectingRef.current && !liveActiveRef.current;
        if (wasPending) {
          setStatusError('Live voice session closed before connecting. Try again or use Voice Note.');
        }
        if (liveActiveRef.current || liveConnectingRef.current) {
          teardownLiveSession();
        }
      };

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      if (inputCtx.state === 'suspended') {
        await inputCtx.resume();
      }
      inputCtxRef.current = inputCtx;
      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!liveActiveRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          return;
        }
        const rawSamples = e.inputBuffer.getChannelData(0);
        const floatSamples = downsampleTo16k(rawSamples, inputCtx.sampleRate);
        const pcm16 = new Int16Array(floatSamples.length);
        for (let i = 0; i < floatSamples.length; i++) {
          const clamped = Math.max(-1, Math.min(1, floatSamples[i]));
          pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
        }
        wsRef.current.send(JSON.stringify({ audio: arrayBufferToBase64(pcm16.buffer) }));
      };

      source.connect(processor);
      processor.connect(inputCtx.destination);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const isDenied = msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('notallowed') || msg.toLowerCase().includes('permission');
      setStatusError(
        isDenied
          ? 'Microphone is blocked here. Allow Microphone in the address bar padlock icon, or open the app link in a new browser tab.'
          : msg || 'Microphone permission is required for live voice.'
      );
      teardownLiveSession();
    }
  };

  const askTextQuestion = async (overrideText?: string) => {
    const q = (overrideText ?? question).trim();
    if (!q || isAsking) return;

    if (liveActive && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ text: q }));
      setInputTranscript(q);
      if (!overrideText) setQuestion('');
      setRobotState('thinking');
      return;
    }

    setStatusError(null);
    setIsAsking(true);
    setRobotState('thinking');
    if (!overrideText) setQuestion('');

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          studentId: activeStudent?.id,
          grade: activeGrade,
          model: selectedModel,
        }),
      });
      const rawBody = await res.text();
      let data: { answer?: string; error?: string } = {};
      try {
        data = JSON.parse(rawBody) as { answer?: string; error?: string };
      } catch {
        throw new Error('AI server returned an unexpected response. Please try again.');
      }
      if (!res.ok || !data.answer) {
        throw new Error(data.error || 'Could not reach LockerBot.');
      }

      setLatestReply(data.answer);
      void speakWithGeminiTTS(data.answer, {
        onStart: () => setRobotState('speaking'),
        onEnd: () => setRobotState('idle'),
        onError: (msg) => {
          setStatusError(msg);
          setRobotState('idle');
        },
      });
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to reach LockerBot.');
      setRobotState('idle');
    } finally {
      setIsAsking(false);
    }
  };

  const toggleVoiceNoteTranscribe = async () => {
    if (isRecordingNote) {
      noteRecorderRef.current?.stop();
      speechRecRef.current?.stop();
      setIsRecordingNote(false);
      return;
    }

    stopSpeaking();
    setStatusError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia unavailable');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      noteChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) noteChunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const baseMime = mimeType.split(';')[0];
        const blob = new Blob(noteChunksRef.current, { type: baseMime });
        const arrayBuf = await blob.arrayBuffer();
        if (arrayBuf.byteLength < 300) {
          setStatusError('Recording was too short. Tap Voice Note, speak clearly, then tap Stop Rec.');
          setRobotState('idle');
          return;
        }
        const audioBase64 = arrayBufferToBase64(arrayBuf);
        setRobotState('thinking');
        try {
          const res = await fetch('/api/ai/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64, mimeType: baseMime }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Transcription failed.');
          if (data.transcript) {
            setInputTranscript(data.transcript);
            await askTextQuestion(data.transcript);
          } else {
            setStatusError('No speech detected in voice recording.');
            setRobotState('idle');
          }
        } catch (err) {
          setStatusError(err instanceof Error ? err.message : 'Transcription error.');
          setRobotState('idle');
        }
      };

      noteRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecordingNote(true);
      setRobotState('listening');
    } catch {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRec) {
        setStatusError(
          'Microphone is blocked here. Click the address bar padlock to allow Microphone, or open the app link in a new browser tab.'
        );
        return;
      }
      const recognition = new SpeechRec();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInputTranscript(transcript);
          void askTextQuestion(transcript);
        }
      };
      recognition.onerror = () => {
        setIsRecordingNote(false);
        setRobotState('idle');
        setStatusError(
          'Microphone is blocked here. Click the address bar padlock to allow Microphone, or open the app link in a new browser tab.'
        );
      };
      recognition.onend = () => {
        setIsRecordingNote(false);
        setRobotState('idle');
      };
      speechRecRef.current = recognition;
      setIsRecordingNote(true);
      setRobotState('listening');
      recognition.start();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="LockerBot 3D Voice Studio"
      className="fixed inset-0 z-50 w-screen h-screen bg-[#0B1120] overflow-hidden"
    >
      {/* Full-bleed 100vw x 100vh 3D WebGL Robot Stage */}
      <ThreeRobotStage variant="full" robotState={robotState} className="w-full h-full" />

      {/* Top-Left Minimal Solid Overlay Header (No backdrop-filter) */}
      <div className="fixed top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/95 border border-slate-700 rounded-xl px-4 py-2.5 flex items-center gap-3 text-white shadow-lg">
          <Radio
            className={`w-4 h-4 ${
              robotState === 'speaking'
                ? 'text-cyan-400'
                : robotState === 'listening'
                ? 'text-emerald-400'
                : robotState === 'thinking'
                ? 'text-amber-400'
                : 'text-sky-400'
            }`}
          />
          <div>
            <h2 className="font-display text-sm font-bold leading-tight">
              LockerBot 3D Voice Studio
            </h2>
            <p className="text-[11px] text-slate-300">
              {activeStudent ? `${activeStudent.name} · Class ${activeGrade}` : `Class ${activeGrade}`}
              {' · '}
              {liveActive
                ? 'Live Voice Connected'
                : robotState === 'speaking'
                ? 'Speaking'
                : robotState === 'listening'
                ? 'Listening'
                : robotState === 'thinking'
                ? 'Thinking'
                : 'Drag to orbit · Ready'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto px-3.5 py-2 rounded-xl bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-lg"
        >
          <X className="w-4 h-4" />
          Exit 3D Studio
        </button>
      </div>

      {/* Collapsible Bottom Control Dock (<= 15% Viewport Footprint, No backdrop-filter) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10 w-[calc(100vw-2rem)] max-w-4xl">
        {dockCollapsed ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setDockCollapsed(false)}
              className="px-4 py-2 rounded-full bg-slate-900/95 border border-slate-700 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-lg"
            >
              <ChevronUp className="w-4 h-4 text-sky-400" />
              Show Voice &amp; Chat Controls
            </button>
          </div>
        ) : (
          <div className="bg-slate-900/95 border border-slate-700 rounded-2xl px-4 py-3 text-white shadow-2xl space-y-2">
            {/* Compact Status & Transcript Ticker */}
            <div className="flex items-start justify-between gap-3 text-xs">
              <div className="min-w-0 flex-1 line-clamp-2 text-slate-200 leading-relaxed">
                {statusError ? (
                  <span className="text-amber-300 font-medium">{statusError}</span>
                ) : inputTranscript ? (
                  <span>
                    <strong className="text-sky-300">You:</strong> {inputTranscript}
                    {' · '}
                    <strong className="text-cyan-300">LockerBot:</strong> {latestReply}
                  </span>
                ) : (
                  <span>
                    <strong className="text-cyan-300">LockerBot:</strong> {latestReply}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    void speakWithGeminiTTS(latestReply, {
                      onStart: () => setRobotState('speaking'),
                      onEnd: () => setRobotState('idle'),
                      onError: (m) => setStatusError(m),
                    })
                  }
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                  title="Replay reply aloud"
                  aria-label="Replay reply aloud"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDockCollapsed(true)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Collapse controls"
                  aria-label="Collapse controls"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Single-Row Compact Action Strip */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void askTextQuestion();
              }}
              className="flex flex-wrap sm:flex-nowrap items-center gap-2"
            >
              <button
                type="button"
                onClick={() => void startLiveVoiceSession()}
                disabled={liveConnecting}
                className={`px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                  liveActive
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {liveActive ? <PhoneOff className="w-3.5 h-3.5" /> : <Radio className="w-3.5 h-3.5" />}
                {liveConnecting ? 'Connecting...' : liveActive ? 'End Live' : 'Live Voice'}
              </button>

              <button
                type="button"
                onClick={() => void toggleVoiceNoteTranscribe()}
                disabled={liveActive}
                className={`px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 border transition-colors ${
                  isRecordingNote
                    ? 'bg-amber-600 border-amber-500 text-white'
                    : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-100 disabled:opacity-40'
                }`}
                title="Record voice note and transcribe with Gemini"
              >
                {isRecordingNote ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                {isRecordingNote ? 'Stop Rec' : 'Voice Note'}
              </button>

              <select
                aria-label="AI Model"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="rounded-xl bg-slate-800 border border-slate-700 px-2.5 py-2 text-xs text-slate-100 focus:outline-none max-w-[160px]"
              >
                {MODEL_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type a question for LockerBot..."
                className="flex-1 min-w-[160px] rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />

              <button
                type="submit"
                disabled={!question.trim() || isAsking}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-45 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                {isAsking ? '...' : 'Ask'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
