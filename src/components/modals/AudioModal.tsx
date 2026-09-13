import { useState } from 'react';
import { useGlobalState } from '../../context/GlobalContext';

const AudioModal = () => {
  const { 
    isAudioModalOpen, 
    setIsAudioModalOpen, 
    audioMode, 
    setAudioMode, 
    spotifyEmbedUrl, 
    setSpotifyEmbedUrl,
    isPlayingBinaural,
    toggleBinaural,
    binauralVolume,
    setBinauralVolume
  } = useGlobalState();
  const [inputUrl, setInputUrl] = useState(spotifyEmbedUrl);

  // Keep iframe mounted, control visibility with CSS

  const handleSaveSpotify = () => {
    setSpotifyEmbedUrl(inputUrl);
  };

  return (
    <div className={`fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${isAudioModalOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
      <div className="bg-surface-container-low w-full max-w-lg rounded-3xl shadow-2xl border border-surface-container-highest overflow-hidden flex flex-col relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-bl-full pointer-events-none blur-xl"></div>
        
        <div className="flex justify-between items-center p-6 border-b border-surface-container-highest">
          <h2 className="font-headline-sm text-on-surface font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">graphic_eq</span>
            Audio & Focus Player
          </h2>
          <button onClick={() => setIsAudioModalOpen(false)} className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-outline">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 mb-6 bg-surface-container p-1 rounded-xl">
            <button 
              onClick={() => setAudioMode('spotify')} 
              className={`flex-1 py-2 rounded-lg font-label-md font-bold transition-colors ${audioMode === 'spotify' ? 'bg-surface-container-low text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Spotify Focus
            </button>
            <button 
              onClick={() => setAudioMode('binaural')} 
              className={`flex-1 py-2 rounded-lg font-label-md font-bold transition-colors ${audioMode === 'binaural' ? 'bg-surface-container-low text-secondary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Binaural 432Hz
            </button>
          </div>

          <div className={`space-y-4 ${audioMode === 'spotify' ? 'block' : 'hidden'}`}>
            <div className="flex gap-2">
              <input
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="flex-1 bg-surface-container p-3 rounded-xl focus:outline-none focus:bg-surface-container-high text-on-surface font-body-sm"
                placeholder="Paste Spotify Playlist URL..."
              />
              <button onClick={handleSaveSpotify} className="px-4 bg-primary text-on-primary rounded-xl font-label-md font-bold hover:brightness-110">Save</button>
            </div>
            <div className="w-full h-[152px] rounded-xl overflow-hidden bg-surface-container-highest">
              <iframe 
                src={spotifyEmbedUrl} 
                width="100%" 
                height="152" 
                frameBorder="0" 
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                loading="lazy">
              </iframe>
            </div>
          </div>

          <div className={`flex flex-col items-center justify-center py-4 space-y-6 ${audioMode === 'binaural' ? 'flex' : 'hidden'}`}>
            <div className="relative w-32 h-32 flex items-center justify-center">
              <div className={`absolute inset-0 rounded-full border-4 border-secondary/30 ${isPlayingBinaural ? 'animate-ping' : ''}`}></div>
              <button 
                onClick={toggleBinaural}
                className="relative z-10 w-24 h-24 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-[0_0_20px_rgba(76,215,246,0.4)] hover:brightness-110 transition-all"
              >
                <span className="material-symbols-outlined text-[40px]">{isPlayingBinaural ? 'pause' : 'play_arrow'}</span>
              </button>
            </div>
            
            <div className="text-center">
              <h3 className="font-headline-sm text-on-surface font-bold">Deep Alpha Waves</h3>
              <p className="font-body-sm text-on-surface-variant">432Hz Frequency • Binaural Entrainment</p>
            </div>

            <div className="w-full flex items-center gap-4 bg-surface-container p-4 rounded-xl">
              <span className="material-symbols-outlined text-outline">volume_mute</span>
              <input 
                type="range" 
                min="0" max="1" step="0.01" 
                value={binauralVolume} 
                onChange={(e) => setBinauralVolume(parseFloat(e.target.value))} 
                className="flex-1 accent-secondary"
              />
              <span className="material-symbols-outlined text-secondary">volume_up</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AudioModal;
