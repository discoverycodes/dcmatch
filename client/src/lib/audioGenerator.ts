// Audio synthesis utility for generating game sounds
export class AudioGenerator {
  private audioContext: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  // Generate victory fanfare sound
  generateVictorySound(): Promise<AudioBuffer | null> {
    if (!this.audioContext) return Promise.resolve(null);

    const sampleRate = this.audioContext.sampleRate;
    const duration = 2.5; // 2.5 seconds
    const frameCount = sampleRate * duration;
    
    const buffer = this.audioContext.createBuffer(2, frameCount, sampleRate);
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      for (let i = 0; i < frameCount; i++) {
        const time = i / sampleRate;
        
        // Victory fanfare with ascending notes
        const note1 = Math.sin(2 * Math.PI * 523.25 * time) * 0.3; // C5
        const note2 = Math.sin(2 * Math.PI * 659.25 * time) * 0.3; // E5
        const note3 = Math.sin(2 * Math.PI * 783.99 * time) * 0.3; // G5
        const note4 = Math.sin(2 * Math.PI * 1046.5 * time) * 0.3; // C6
        
        // Create ascending melody
        let volume = 1;
        if (time < 0.5) {
          volume = note1;
        } else if (time < 1.0) {
          volume = note2;
        } else if (time < 1.5) {
          volume = note3;
        } else {
          volume = note4;
        }
        
        // Add envelope (fade in/out)
        const envelope = Math.sin(Math.PI * time / duration);
        
        channelData[i] = volume * envelope * 0.3;
      }
    }
    
    return Promise.resolve(buffer);
  }

  // Generate game over sound (descending minor chord)
  generateGameOverSound(): Promise<AudioBuffer | null> {
    if (!this.audioContext) return Promise.resolve(null);

    const sampleRate = this.audioContext.sampleRate;
    const duration = 3.0; // 3 seconds
    const frameCount = sampleRate * duration;
    
    const buffer = this.audioContext.createBuffer(2, frameCount, sampleRate);
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      for (let i = 0; i < frameCount; i++) {
        const time = i / sampleRate;
        
        // Game over sound with descending minor chord
        const note1 = Math.sin(2 * Math.PI * 349.23 * time) * 0.2; // F4
        const note2 = Math.sin(2 * Math.PI * 415.30 * time) * 0.2; // G#4
        const note3 = Math.sin(2 * Math.PI * 523.25 * time) * 0.2; // C5
        
        // Slow descending effect
        const frequency = 349.23 - (time * 50); // Descending frequency
        const descending = Math.sin(2 * Math.PI * frequency * time);
        
        // Mix notes with descending effect
        const mixed = (note1 + note2 + note3 + descending) * 0.25;
        
        // Add decay envelope
        const envelope = Math.exp(-time * 2);
        
        channelData[i] = mixed * envelope * 0.4;
      }
    }
    
    return Promise.resolve(buffer);
  }

  // Convert AudioBuffer to blob URL
  createAudioURL(buffer: AudioBuffer): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.audioContext) {
        reject(new Error('No audio context available'));
        return;
      }

      // Create offline context to render audio
      const offlineContext = new OfflineAudioContext(
        buffer.numberOfChannels,
        buffer.length,
        buffer.sampleRate
      );

      const source = offlineContext.createBufferSource();
      source.buffer = buffer;
      source.connect(offlineContext.destination);
      source.start();

      offlineContext.startRendering().then((renderedBuffer) => {
        // Convert to WAV blob
        const wav = this.bufferToWave(renderedBuffer);
        const blob = new Blob([wav], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        resolve(url);
      }).catch(reject);
    });
  }

  // Convert AudioBuffer to WAV format
  private bufferToWave(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // PCM data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  }
}

export const audioGenerator = new AudioGenerator();