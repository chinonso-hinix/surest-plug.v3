import React, { useState, useRef, useEffect } from 'react';

interface VoiceNotePlayerProps {
  audioData: string;
  duration?: number;
  isCurrentUser?: boolean;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  audioData,
  duration = 0,
  isCurrentUser = false
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setAudioDuration(Math.round(audio.duration));
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(Math.round(audio.currentTime));
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioData]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-2xl max-w-sm ${
      isCurrentUser 
        ? 'bg-blue-700/80 text-white' 
        : 'bg-white border border-slate-200 text-slate-800 shadow-xs'
    }`}>
      <audio ref={audioRef} src={audioData} preload="metadata" />

      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer ${
          isCurrentUser 
            ? 'bg-white text-blue-700 hover:bg-blue-50' 
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
      >
        {isPlaying ? (
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-[120px]">
        <div className="flex items-center gap-1 h-5">
          {/* Simulated waveform bars with playback animation */}
          {[40, 70, 30, 90, 60, 100, 45, 80, 55, 75, 95, 40, 65, 85, 30, 60].map((h, i) => {
            const barProgress = (i / 16) * 100;
            const isPlayed = progress >= barProgress;
            return (
              <span
                key={i}
                style={{ height: `${h}%` }}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isPlayed
                    ? isCurrentUser ? 'bg-white' : 'bg-blue-600'
                    : isCurrentUser ? 'bg-blue-400/60' : 'bg-slate-300'
                } ${isPlaying && isPlayed ? 'opacity-100 scale-y-110' : 'opacity-80'}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between items-center text-[10px] font-mono mt-1 opacity-90">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(audioDuration || duration || 0)}</span>
        </div>
      </div>
    </div>
  );
};

export default VoiceNotePlayer;
