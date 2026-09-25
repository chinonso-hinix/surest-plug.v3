import React, { useState, useRef, useEffect } from 'react';

interface VoiceRecorderProps {
  onAudioRecorded: (audioBase64: string, durationSeconds: number) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onAudioRecorded,
  onCancel,
  disabled = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingSecondsRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      // Clean up stream & timers on unmount
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (_) {}
        });
      }
    };
  }, []);

  const startRecording = async () => {
    setPermissionError(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);
    recordingSecondsRef.current = 0;

    try {
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        setPermissionError('Direct microphone recording is not supported in this browser environment. You can upload an audio file below.');
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (mediaErr: any) {
        // Graceful handling of browser/iframe permission refusal
        const errorName = mediaErr?.name || '';
        if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError' || mediaErr?.message?.includes('Permission denied')) {
          setPermissionError('Microphone permission was denied. Please allow microphone access in your browser settings or upload an audio file below.');
        } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
          setPermissionError('No microphone detected on your device. You can upload an audio file below.');
        } else {
          setPermissionError('Could not access microphone. You can upload an audio file below.');
        }
        return;
      }

      streamRef.current = stream;

      let mimeType = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else {
          mimeType = '';
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        
        // Convert blob to base64 data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          onAudioRecorded(base64data, Math.max(1, recordingSecondsRef.current));
        };
        reader.readAsDataURL(audioBlob);

        // Stop all audio tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (_) {}
          });
          streamRef.current = null;
        }
      };

      mediaRecorder.start(100); // chunk every 100ms
      setIsRecording(true);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          const next = prev + 1;
          recordingSecondsRef.current = next;
          // Limit recording to 2 minutes max (120s)
          if (next >= 120) {
            stopRecording();
          }
          return next;
        });
      }, 1000);

    } catch (err: any) {
      setPermissionError('Microphone unavailable in this environment. You can upload an audio note instead.');
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (_) {}
      });
      streamRef.current = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    recordingSecondsRef.current = 0;
    audioChunksRef.current = [];
    if (onCancel) onCancel();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an audio file
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|aac|webm)$/i)) {
      setPermissionError('Please select a valid audio file (e.g. .mp3, .wav, .m4a, .webm).');
      return;
    }

    // Limit size to 15MB
    if (file.size > 15 * 1024 * 1024) {
      setPermissionError('Audio file is too large (maximum 15MB).');
      return;
    }

    setIsProcessingFile(true);
    setPermissionError(null);

    // Calculate duration using temporary object URL
    const tempAudio = new Audio();
    const objectUrl = URL.createObjectURL(file);
    tempAudio.src = objectUrl;

    const finalizeWithDuration = (durationSec: number) => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setIsProcessingFile(false);
        onAudioRecorded(base64, Math.max(1, Math.round(durationSec)));
      };
      reader.onerror = () => {
        setIsProcessingFile(false);
        setPermissionError('Failed to read audio file.');
      };
      reader.readAsDataURL(file);
    };

    tempAudio.onloadedmetadata = () => {
      const dur = isFinite(tempAudio.duration) && tempAudio.duration > 0 ? tempAudio.duration : 10;
      finalizeWithDuration(dur);
    };

    tempAudio.onerror = () => {
      // Fallback if metadata couldn't be loaded immediately
      finalizeWithDuration(15);
    };
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Hidden file input for audio uploads */}
      <input
        type="file"
        ref={fileInputRef}
        accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac"
        onChange={handleFileUpload}
        className="hidden"
      />

      {permissionError && (
        <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-start gap-2">
          <span className="shrink-0">⚠️</span>
          <div className="flex-1">
            <p>{permissionError}</p>
          </div>
          <button
            type="button"
            onClick={() => setPermissionError(null)}
            className="text-amber-600 hover:text-amber-900 font-bold ml-1 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {isRecording ? (
        <div className="flex items-center gap-3 p-2.5 bg-red-50 border border-red-200 rounded-2xl animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600 animate-ping"></span>
            <span className="text-xs font-mono font-bold text-red-700">
              Recording {formatTimer(recordingSeconds)} / 2:00
            </span>
          </div>

          <div className="flex-1 flex justify-end items-center gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>⏹</span>
              <span>Done</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={disabled || isProcessingFile}
            onClick={startRecording}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span>Record Voice Note</span>
          </button>

          <button
            type="button"
            disabled={disabled || isProcessingFile}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs font-medium rounded-xl border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Upload pre-recorded voice or audio file"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>{isProcessingFile ? 'Loading audio...' : 'Upload Audio'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;

