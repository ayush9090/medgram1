import React, { useRef, useEffect, useState } from 'react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  isActive: boolean; // Managed by parent list virtualization or intersection
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, poster, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (isActive) {
      const playPromise = videoRef.current?.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((error) => {
            console.log("Autoplay prevented:", error);
            setIsPlaying(false);
          });
      }
    } else {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="relative w-full aspect-[9/16] bg-black rounded-lg overflow-hidden cursor-pointer" onClick={togglePlay}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-cover"
        playsInline
        loop
        muted={isMuted}
      />
      
      {/* Play/Pause Overlay Icon - only show when paused */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <svg className="w-16 h-16 text-white opacity-80" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      )}

      {/* Mute Toggle */}
      <button 
        onClick={toggleMute}
        className="absolute bottom-4 right-4 bg-black/50 p-2 rounded-full text-white backdrop-blur-sm hover:bg-black/70 transition"
      >
        {isMuted ? (
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
        ) : (
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        )}
      </button>
    </div>
  );
};