let currentAudio: HTMLAudioElement | null = null;
let playbackGeneration = 0;

export function stopSpeaking(): void {
  playbackGeneration += 1;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function speakWithBrowserVoice(
  text: string,
  options?: {
    onStart?: () => void;
    onEnd?: () => void;
  }
): void {
  stopSpeaking();
  const cleanText = text.replace(/[*_`#]/g, '').trim();
  if (!cleanText || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options?.onEnd?.();
    return;
  }
  const myGen = playbackGeneration;
  options?.onStart?.();
  try {
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.98;
    utterance.pitch = 1.05;
    utterance.onend = () => {
      if (myGen === playbackGeneration) options?.onEnd?.();
    };
    utterance.onerror = () => {
      if (myGen === playbackGeneration) options?.onEnd?.();
    };
    window.speechSynthesis.speak(utterance);
  } catch {
    options?.onEnd?.();
  }
}

export async function speakWithGeminiTTS(
  text: string,
  options?: {
    style?: string;
    voiceName?: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (msg: string) => void;
  }
): Promise<void> {
  stopSpeaking();
  const myGen = playbackGeneration;
  const cleanText = text.replace(/[*_`#]/g, '').trim();
  if (!cleanText) return;

  options?.onStart?.();

  try {
    const res = await fetch('/api/ai/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanText,
        style: options?.style,
        voiceName: options?.voiceName ?? 'Kore',
      }),
    });

    if (myGen !== playbackGeneration) return;

    const data = (await res.json()) as { audioBase64?: string; mimeType?: string; error?: string };
    if (!res.ok || !data.audioBase64) {
      throw new Error(data.error || 'Gemini TTS failed.');
    }

    const audioUrl = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
    const audio = new Audio(audioUrl);
    currentAudio = audio;

    audio.onended = () => {
      if (currentAudio === audio) currentAudio = null;
      if (myGen === playbackGeneration) {
        options?.onEnd?.();
      }
    };
    audio.onerror = () => {
      if (currentAudio === audio) currentAudio = null;
      if (myGen === playbackGeneration) {
        options?.onEnd?.();
      }
    };

    await audio.play();
  } catch (err) {
    if (myGen !== playbackGeneration) return;
    const message = err instanceof Error ? err.message : 'Unable to play Gemini voice.';
    // Silently fall back to browser SpeechSynthesis so voice replies continue smoothly
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 0.98;
        utterance.pitch = 1.05;
        utterance.onend = () => {
          if (myGen === playbackGeneration) options?.onEnd?.();
        };
        utterance.onerror = () => {
          if (myGen === playbackGeneration) options?.onEnd?.();
        };
        window.speechSynthesis.speak(utterance);
        return;
      } catch {
        // Ignore and surface error below
      }
    }
    options?.onEnd?.();
    options?.onError?.(message);
  }
}
