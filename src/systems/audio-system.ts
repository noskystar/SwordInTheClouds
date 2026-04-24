import type { Scene } from 'phaser';
import { SettingsSystem } from './settings-system';

export class AudioSystem {
  private scene: Scene;
  private settingsSystem: SettingsSystem;
  private currentBgm?: Phaser.Sound.WebAudioSound;

  // Synth tones for placeholder SFX
  private readonly sfxTones: Record<string, number> = {
    ui_click: 880,
    ui_confirm: 1320,
    ui_cancel: 440,
    ui_open: 660,
    ui_close: 330,
    attack: 220,
    hit: 110,
    crit: 1760,
    heal: 990,
    buff: 770,
    debuff: 550,
    flee: 330,
    victory: 528,
    defeat: 165,
    skill_fire: 880,
    skill_water: 660,
    skill_wood: 770,
    skill_metal: 990,
    skill_earth: 550,
    sword_intent: 1320,
    step: 55,
  };

  constructor(scene: Scene, settingsSystem: SettingsSystem) {
    this.scene = scene;
    this.settingsSystem = settingsSystem;

    this.settingsSystem.on('changed:masterVolume', () => this.updateVolumes());
    this.settingsSystem.on('changed:musicVolume', () => this.updateVolumes());
    this.settingsSystem.on('changed:sfxVolume', () => this.updateVolumes());
  }

  playSFX(key: string, duration = 150): void {
    const sfxVol = this.settingsSystem.get('sfxVolume');
    const masterVol = this.settingsSystem.get('masterVolume');
    const volume = sfxVol * masterVol;
    if (volume <= 0) return;

    const freq = this.sfxTones[key] ?? 440;
    this.playTone(freq, duration, volume);
  }

  playBGM(_key: string): void {
    this.stopBGM();
    // Placeholder: BGM not implemented without real audio files.
  }

  stopBGM(): void {
    if (this.currentBgm) {
      this.currentBgm.stop();
      this.currentBgm.destroy();
      this.currentBgm = undefined;
    }
  }

  private playTone(frequency: number, duration: number, volume: number): void {
    const sound = this.scene.sound as Phaser.Sound.WebAudioSoundManager;
    if (!sound.context) return;
    try {
      const ctx = sound.context;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(volume * 0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration / 1000);
    } catch {
      // ignore audio context errors
    }
  }

  private updateVolumes(): void {
    const musicVol = this.settingsSystem.get('musicVolume');
    const masterVol = this.settingsSystem.get('masterVolume');
    if (this.currentBgm) {
      (this.currentBgm as Phaser.Sound.WebAudioSound).setVolume(musicVol * masterVol);
    }
  }
}
