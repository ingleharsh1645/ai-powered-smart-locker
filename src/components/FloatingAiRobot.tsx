import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Maximize2,
  Mic,
  MicOff,
  Radio,
  RotateCcw,
  Send,
  Square,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { LottieRobot } from './LottieRobot';
import { speakWithBrowserVoice, speakWithGeminiTTS, stopSpeaking } from '../utils/ttsPlayer';
import type { ChatTurn, GradeLevel, Student } from '../types/school';

interface SpeechRecognitionEventLike {
  results: {
    [index: number]: {
      [index: number]: { transcript: string };
    };
  };
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

const MODEL_OPTIONS = [
  { id: 'gemini-3.1-flash-lite', label: 'Fast Buddy (3.1-Flash-Lite)' },
  { id: 'gemini-4-hydrogen', label: 'School Assistant (4-Hydrogen)' },
  { id: 'gemini-4-carbon', label: 'Deep Tutor (4-Carbon · Paid Key)' },
  { id: 'gemini-4-neon', label: 'Interactive Coach (4-Neon · Paid Key)' },
] as const;

const QUICK_PROMPTS = [
  "What is today's timetable?",
  "Explain today's homework",
  "Tell me today's Paripath",
  'What did my child take from the locker?',
];

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function FloatingAiRobot({
  isOpen,
  onToggle,
  onOpen3DStudio,
  activeStudent,
  activeGrade,
  prefillQuestion,
  onClearPrefill,
}: {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  onOpen3DStudio: () => void;
  activeStudent: Student | undefined;
  activeGrade: GradeLevel;
  prefillQuestion: string | null;
  onClearPrefill: () => void;
}) {
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      role: 'model',
      text: "Hi! I'm LockerBot, your 3D Siri school buddy. Ask me about today's timetable, homework, Aaj Ka Paripath, smart locker items, or tap 3D Live Studio to talk with me face-to-face!",
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-3.1-flash-lite',
    },
  ]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.1-flash-lite');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const sendMessage = async (questionText?: string) => {
    const trimmed = (questionText ?? input).trim();
    if (!trimmed || isLoading) return;

    setErrorBanner(null);
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const userTurn: ChatTurn = {
      role: 'user',
      text: trimmed,
      timestamp: nowTime,
    };

    const historyForApi = messages
      .filter((m, idx) => !(idx === 0 && m.role === 'model'))
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userTurn]);
    if (!questionText) setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          studentId: activeStudent?.id,
          grade: activeGrade,
          model: selectedModel,
          history: historyForApi,
        }),
      });

      const rawBody = await res.text();
      let data: { answer?: string; modelUsed?: string; error?: string } = {};
      try {
        data = JSON.parse(rawBody) as { answer?: string; modelUsed?: string; error?: string };
      } catch {
        throw new Error('AI server returned an unexpected response. Please try again in a moment.');
      }

      if (!res.ok || !data.answer) {
        throw new Error(data.error || 'Could not reach LockerBot.');
      }

      const botTurn: ChatTurn = {
        role: 'model',
        text: data.answer,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.modelUsed || selectedModel,
      };
      setMessages((prev) => [...prev, botTurn]);

      if (autoSpeak) {
        speakWithBrowserVoice(data.answer, {
          onStart: () => setIsSpeaking(true),
          onEnd: () => setIsSpeaking(false),
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setErrorBanner(msg);
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: `Sorry, I couldn't reply right now: ${msg}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (prefillQuestion && isOpen && !isLoading) {
      const q = prefillQuestion;
      onClearPrefill();
      void sendMessage(q);
    }
  });

  const toggleVoiceNoteTranscribe = async () => {
    if (isRecordingAudio) {
      recorderRef.current?.stop();
      setIsRecordingAudio(false);
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    stopSpeaking();
    setIsSpeaking(false);
    setErrorBanner(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const baseMime = mimeType.split(';')[0];
        const blob = new Blob(audioChunksRef.current, { type: baseMime });
        const arrayBuf = await blob.arrayBuffer();
        if (arrayBuf.byteLength < 300) {
          setErrorBanner('Recording was too short. Tap the mic, speak clearly, then tap stop.');
          return;
        }
        const audioBase64 = bufferToBase64(arrayBuf);
        setIsLoading(true);
        try {
          const res = await fetch('/api/ai/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64, mimeType: baseMime }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Voice transcription failed.');
          if (data.transcript) {
            setIsLoading(false);
            await sendMessage(data.transcript);
          } else {
            setIsLoading(false);
            setErrorBanner('No clear speech detected. Try speaking closer to the mic.');
          }
        } catch (err) {
          setIsLoading(false);
          setErrorBanner(err instanceof Error ? err.message : 'Could not transcribe voice note.');
        }
      };

      recorderRef.current = recorder;
      recorder.start(250);
      setIsRecordingAudio(true);
    } catch {
      // Fallback to Web Speech API if MediaRecorder mic fails or is unavailable
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRec) {
        setErrorBanner(
          'Microphone is blocked here. Allow Microphone in the address bar padlock icon, or open the app link in a new browser tab.'
        );
        return;
      }
      const recognition = new SpeechRec();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          void sendMessage(transcript);
        }
      };
      recognition.onerror = () => {
        setIsListening(false);
        setErrorBanner(
          'Microphone is blocked here. Allow Microphone in the address bar padlock icon, or open the app link in a new browser tab.'
        );
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      setIsListening(true);
      recognition.start();
    }
  };

  const handleResetChat = () => {
    stopSpeaking();
    setIsSpeaking(false);
    setErrorBanner(null);
    setMessages([
      {
        role: 'model',
        text: `Fresh conversation started! I'm tuned to ${activeStudent?.name ?? 'your class'} (Class ${activeGrade}). Ask me anything!`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: selectedModel,
      },
    ]);
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end">
      {isOpen && (
        <section
          aria-label="LockerBot AI Assistant Chat"
          className="mb-3 w-[calc(100vw-2rem)] sm:w-[430px] max-h-[78vh] flex flex-col bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-900 text-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                <LottieRobot size={38} active={isLoading || isSpeaking || isListening || isRecordingAudio} />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-base font-semibold leading-tight truncate">
                  LockerBot Siri AI
                </h3>
                <p className="text-xs text-slate-300 truncate">
                  {activeStudent ? `${activeStudent.name} · Class ${activeGrade}` : `Class ${activeGrade}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onToggle(false);
                  onOpen3DStudio();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 mr-1 transition-colors"
                title="Open Full-Screen 3D Live Voice Studio"
              >
                <Maximize2 className="w-3 h-3" />
                3D Live
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !autoSpeak;
                  setAutoSpeak(next);
                  if (!next) {
                    stopSpeaking();
                    setIsSpeaking(false);
                  }
                }}
                className="p-2 rounded-lg text-slate-200 hover:bg-slate-800 transition-colors"
                title={autoSpeak ? 'Mute automatic voice reply' : 'Enable automatic voice reply'}
                aria-label={autoSpeak ? 'Mute automatic voice reply' : 'Enable automatic voice reply'}
              >
                {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleResetChat}
                className="p-2 rounded-lg text-slate-200 hover:bg-slate-800 transition-colors"
                title="Start new conversation"
                aria-label="Start new conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onToggle(false)}
                className="p-2 rounded-lg text-slate-200 hover:bg-slate-800 transition-colors"
                title="Close assistant"
                aria-label="Close assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Model Selector Bar */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
            <label htmlFor="robot-model-select" className="text-xs font-medium text-slate-600 shrink-0">
              AI Mode
            </label>
            <select
              id="robot-model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600 max-w-[240px]"
            >
              {MODEL_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Scrollable Conversation Thread */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#F7F9FC] min-h-[250px] max-h-[360px]">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div key={idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-blue-700 text-white'
                        : 'bg-white text-slate-800 border border-slate-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 px-1">
                    <span className="tabular-nums">{msg.timestamp}</span>
                    {!isUser && msg.modelUsed && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{msg.modelUsed}</span>
                        <span aria-hidden="true">·</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (isSpeaking) {
                              stopSpeaking();
                              setIsSpeaking(false);
                            } else {
                              void speakWithGeminiTTS(msg.text, {
                                onStart: () => setIsSpeaking(true),
                                onEnd: () => setIsSpeaking(false),
                                onError: (m) => setErrorBanner(m),
                              });
                            }
                          }}
                          className="inline-flex items-center gap-1 font-medium text-blue-700 hover:text-blue-900"
                        >
                          {isSpeaking ? (
                            <>
                              <Square className="w-3 h-3" /> Stop
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3 h-3" /> Speak
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex items-start">
                <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm text-slate-600">
                  {isRecordingAudio ? 'Transcribing audio...' : 'Thinking...'}
                </div>
              </div>
            )}
            <div ref={threadEndRef} />
          </div>

          {/* Error Banner */}
          {errorBanner && (
            <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
              <span className="leading-snug">{errorBanner}</span>
            </div>
          )}

          {/* Quick Suggestion Chips */}
          <div className="px-3 py-2 bg-white border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void sendMessage(q)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-800 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => void toggleVoiceNoteTranscribe()}
              className={`p-2.5 rounded-xl border transition-colors shrink-0 ${
                isRecordingAudio || isListening
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title={
                isRecordingAudio || isListening
                  ? 'Stop recording & transcribe'
                  : 'Record voice question (Gemini Transcribe)'
              }
              aria-label={isRecordingAudio || isListening ? 'Stop voice recording' : 'Record voice question'}
            >
              {isRecordingAudio || isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isRecordingAudio
                  ? 'Recording voice note... click mic to send'
                  : isListening
                  ? 'Listening...'
                  : 'Ask about homework, Paripath, locker...'
              }
              className="flex-1 min-w-0 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
            />

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-3.5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-45 text-white text-sm font-medium inline-flex items-center gap-1.5 shrink-0 transition-colors"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </section>
      )}

      {/* Persistent Floating 3D Siri Robot Launcher (Available in ALL Sections) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpen3DStudio}
          aria-label="Launch 3D Live Voice Robot"
          className="px-3.5 py-2.5 rounded-full bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-lg transition-transform active:scale-95"
        >
          <Radio className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Talk 3D Live</span>
        </button>

        <button
          type="button"
          onClick={() => onToggle(!isOpen)}
          aria-label={isOpen ? 'Close LockerBot assistant' : 'Open LockerBot voice assistant'}
          className="group flex items-center gap-2.5 pl-1.5 pr-4 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-xl border border-slate-700 transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center shrink-0">
            <LottieRobot size={42} active={isOpen || isLoading || isSpeaking || isListening || isRecordingAudio} />
          </div>
          <span className="text-sm font-semibold whitespace-nowrap">
            {isOpen ? 'Hide Buddy' : 'Ask Siri Robot'}
          </span>
        </button>
      </div>
    </div>
  );
}
