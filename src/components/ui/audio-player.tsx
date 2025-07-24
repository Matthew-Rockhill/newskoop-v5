'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  MusicalNoteIcon,
  PlayIcon,
  PauseIcon,
} from '@heroicons/react/24/outline';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';

interface AudioClip {
  id: string;
  url: string;
  originalName: string;
  description?: string;
  duration?: number;
}

interface CustomAudioPlayerProps {
  clip: AudioClip;
  onPlay?: (audioId: string) => void;
  onStop?: (audioId: string) => void;
  onRestart?: (audioId: string) => void;
  onSeek?: (audioId: string, time: number) => void;
  onTimeUpdate?: (audioId: string, currentTime: number) => void;
  onLoadedMetadata?: (audioId: string, duration: number) => void;
  onEnded?: (audioId: string) => void;
  onError?: (audioId: string) => void;
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
}

export function CustomAudioPlayer({
  clip,
  onPlay,
  onStop,
  onRestart,
  onSeek,
  onTimeUpdate,
  onLoadedMetadata,
  onEnded,
  onError,
  isPlaying = false,
  currentTime = 0,
  duration = 0,
}: CustomAudioPlayerProps) {
  const playerRef = useRef<AudioPlayer>(null);

  const handlePlay = useCallback(() => {
    onPlay?.(clip.id);
  }, [onPlay, clip.id]);

  const handlePause = useCallback(() => {
    onPlay?.(clip.id); // Toggle play state
  }, [onPlay, clip.id]);

  const handleEnded = useCallback(() => {
    onEnded?.(clip.id);
  }, [onEnded, clip.id]);

  const handleError = useCallback(() => {
    onError?.(clip.id);
  }, [onError, clip.id]);

  const handleLoadedMetadata = useCallback((e: any) => {
    onLoadedMetadata?.(clip.id, e.target.duration);
  }, [onLoadedMetadata, clip.id]);

  const handleTimeUpdate = useCallback((e: any) => {
    onTimeUpdate?.(clip.id, e.target.currentTime);
  }, [onTimeUpdate, clip.id]);

  const handleSeeked = useCallback((e: any) => {
    onSeek?.(clip.id, e.target.currentTime);
  }, [onSeek, clip.id]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      {/* Audio Info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <MusicalNoteIcon className="h-5 w-5 text-kelly-green" />
          <div>
            <p className="font-medium text-gray-900">{clip.originalName}</p>
            {clip.description && (
              <p className="text-sm text-gray-500">{clip.description}</p>
            )}
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {duration > 0 ? formatTime(duration) : 
           (clip.duration && `${Math.round(clip.duration / 60)}:${(clip.duration % 60).toString().padStart(2, '0')}`)}
        </div>
      </div>

      {/* Custom Styled Audio Player */}
      <div className="custom-audio-player">
        <AudioPlayer
          ref={playerRef}
          src={clip.url}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onError={handleError}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onSeeked={handleSeeked}
          showJumpControls={false}
          showFilledProgress={true}
          showDownloadProgress={false}
          showSkipControls={false}
          showFilledVolume={false}
          layout="horizontal"
          customProgressBarSection={[
            'CURRENT_TIME',
            'PROGRESS_BAR',
            'DURATION',
          ]}
          customControlsSection={[
            'MAIN_CONTROLS',
          ]}
          customVolumeControls={[]} // This removes volume controls
          customIcons={{
            play: <PlayIcon className="h-5 w-5" />,
            pause: <PauseIcon className="h-5 w-5" />,
          }}
        />
      </div>

      <style jsx global>{`
        /* Container styling */
        .custom-audio-player .rhap_container {
          background: transparent;
          box-shadow: none;
          padding: 0;
          border-radius: 0;
        }
        
        /* Main controls button styling */
        .custom-audio-player .rhap_main-controls-button {
          color: #71a234;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
        }
        
        .custom-audio-player .rhap_main-controls-button:hover {
          color: #5fa013;
        }
        
        .custom-audio-player .rhap_play-pause-button {
          font-size: inherit;
        }
        
        /* Progress bar styling */
        .custom-audio-player .rhap_progress-section {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .custom-audio-player .rhap_progress-container {
          flex: 1;
          height: 8px;
          background-color: #e5e7eb;
          border-radius: 4px;
          position: relative;
          cursor: pointer;
        }
        
        .custom-audio-player .rhap_progress-bar {
          background-color: transparent;
          height: 100%;
        }
        
        .custom-audio-player .rhap_progress-filled,
        .custom-audio-player .rhap_download-progress {
          background-color: #71a234;
          height: 100%;
          border-radius: 4px;
          position: absolute;
          top: 0;
          left: 0;
        }
        
        /* Hide the progress indicator (circle) */
        .custom-audio-player .rhap_progress-indicator {
          display: none;
        }
        
        /* Time display styling */
        .custom-audio-player .rhap_time {
          color: #6b7280;
          font-size: 0.75rem;
          line-height: 1rem;
          font-family: inherit;
        }
        
        .custom-audio-player .rhap_current-time {
          margin-right: 0;
        }
        
        .custom-audio-player .rhap_total-time {
          margin-left: 0;
        }
        
        /* Hide volume controls completely */
        .custom-audio-player .rhap_volume-controls {
          display: none;
        }
        
        /* Additional controls section */
        .custom-audio-player .rhap_additional-controls {
          display: none;
        }
        
        /* Controls section layout */
        .custom-audio-player .rhap_controls-section {
          display: flex;
          align-items: center;
          margin-top: 8px;
        }
        
        /* Main section layout */
        .custom-audio-player .rhap_main {
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  );
}