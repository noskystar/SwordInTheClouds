import { Scene } from 'phaser';
import { BattleSystem, type PlayerBattleStats } from '../systems/battle-system';
import type { BattleEntity, BattleAction, BattleEvent, BattleResult, Buff, FiveElement, SkillData } from '../types/battle';
import { SettingsSystem } from '../systems/settings-system';
import { AudioSystem } from '../systems/audio-system';
import skillsData from '../data/skills.json';
import enemiesData from '../data/enemies.json';
import battleGroupsData from '../data/battle-groups.json';
import comboSkillsData from '../data/combo-skills.json';
import { uiTextStyle } from '../ui/text-style';

interface BattleSceneData {
  battleGroupId: string;
  playerStats: PlayerBattleStats;
  returnScene?: string;
}

interface EntityDisplay {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;
  nameText: Phaser.GameObjects.Text;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBarBg: Phaser.GameObjects.Rectangle;
  mpBar: Phaser.GameObjects.Rectangle;
  mpBarBg: Phaser.GameObjects.Rectangle;
  atbBar: Phaser.GameObjects.Rectangle;
  atbBarBg: Phaser.GameObjects.Rectangle;
  buffIcons: Phaser.GameObjects.Text[];
}

type MenuState = 'hidden' | 'action' | 'skill' | 'target' | 'executing' | 'ended';

const MENU_OPTIONS = ['攻击', '防御', '剑诀', '逃跑'];
const ELEMENT_NAMES: Record<FiveElement, string> = {
  metal: '金',
  wood: '木',
  earth: '土',
  water: '水',
  fire: '火',
};

export class BattleScene extends Scene {
  private battleSystem!: BattleSystem;
  private entityDisplays = new Map<string, EntityDisplay>();
  private menuContainer!: Phaser.GameObjects.Container;
  private menuItems: Phaser.GameObjects.Text[] = [];
  private menuState: MenuState = 'hidden';
  private selectedMenuIndex = 0;
  private battleLog!: Phaser.GameObjects.Text;
  private logEntries: string[] = [];
  private swordIntentBar!: Phaser.GameObjects.Rectangle;
  private swordIntentText!: Phaser.GameObjects.Text;
  private targetArrows: Phaser.GameObjects.Triangle[] = [];
  private selectedTargetIndex = 0;
  private skillList: SkillData[] = [];
  private pendingAction?: Partial<BattleAction>;
  private isProcessing = false;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private confirmKey!: Phaser.Input.Keyboard.Key;
  private cancelKey!: Phaser.Input.Keyboard.Key;
  private returnScene = 'OverworldScene';
  private audioSystem!: AudioSystem;

  constructor() {
    super({ key: 'BattleScene' });
  }

  create(data: BattleSceneData): void {
    this.returnScene = data.returnScene ?? 'OverworldScene';
    this.cameras.main.fadeIn(300, 0, 0, 0);

    const group = battleGroupsData.find((g) => g.id === data.battleGroupId);
    if (!group) {
      this.addLog('战斗组未找到');
      return;
    }

    // Show battle background
    const bgKey = this.getBackgroundKey(data.battleGroupId);
    if (this.textures.exists(bgKey)) {
      const bg = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, bgKey);
      bg.setDisplaySize(this.cameras.main.width, this.cameras.main.height);
      bg.setOrigin(0.5);
      bg.setDepth(0);
    } else {
      this.cameras.main.setBackgroundColor(group.backgroundColor ?? 0x1a1a2e);
    }

    const enemies = group.enemies
      .map((eid) => enemiesData.find((e) => e.id === eid))
      .filter((e): e is NonNullable<typeof e> => e !== undefined)
      .map((e) => ({ ...e, element: e.element as FiveElement }));

    this.battleSystem = new BattleSystem(
      data.playerStats,
      enemies,
      skillsData as SkillData[],
      comboSkillsData as import('../types/battle').ComboSkillData[]
    );

    this.audioSystem = new AudioSystem(this, new SettingsSystem());
    this.setupInput();
    this.createEntityDisplays();
    this.createMenu();
    this.createBattleLog();
    this.createSwordIntentDisplay();
    this.setupBattleEvents();

    this.battleSystem.startBattle();
    this.addLog(`遭遇：${group.name}`);
  }

  update(_time: number, delta: number): void {
    if (this.menuState === 'ended' || this.isProcessing) return;

    if (this.menuState === 'hidden') {
      const readyId = this.battleSystem.tick(delta);
      this.updateATBBars();

      if (readyId && !this.battleSystem.getPlayer().isAlive) {
        this.battleSystem.executeAction(readyId, this.battleSystem.getEnemyAction(readyId));
      }
    }

    this.handleMenuInput();
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.confirmKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.cancelKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  private createEntityDisplays(): void {
    const player = this.battleSystem.getPlayer();
    this.createEntityDisplay(player, 60, 90);

    const enemies = this.battleSystem.getAliveEnemies();
    const startY = 90 - ((enemies.length - 1) * 30) / 2;
    for (let i = 0; i < enemies.length; i++) {
      this.createEntityDisplay(enemies[i], 260, startY + i * 30);
    }
  }

  private createEntityDisplay(entity: BattleEntity, x: number, y: number): void {
    const container = this.add.container(x, y);

    // Try to use a sprite image, fall back to colored rectangle
    let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
    const spriteKey = entity.isPlayer ? null : this.getEnemySpriteKey(entity.id);
    if (spriteKey && this.textures.exists(spriteKey)) {
      sprite = this.add.image(0, -12, spriteKey);
      sprite.setDisplaySize(entity.isPlayer ? 24 : 32, entity.isPlayer ? 24 : 24);
      (sprite as Phaser.GameObjects.Image).setOrigin(0.5);
    } else {
      sprite = this.add.rectangle(0, -8, 24, 24, entity.color);
      sprite.setStrokeStyle(1, 0xffffff);
    }

    const nameText = this.add.text(0, -27, entity.name, uiTextStyle({
      fontSize: '7px',
      color: '#ffffff',
    }));
    nameText.setOrigin(0.5);

    const elementText = this.add.text(entity.isPlayer ? -14 : 14, -27, ELEMENT_NAMES[entity.element], uiTextStyle({
      fontSize: '7px',
      color: this.getElementColor(entity.element),
    }));
    elementText.setOrigin(0.5);

    const hpBarBg = this.add.rectangle(0, 8, 32, 4, 0x333333);
    const hpBar = this.add.rectangle(-16, 8, 32, 4, 0x44aa44);
    hpBar.setOrigin(0, 0.5);

    const mpBarBg = this.add.rectangle(0, 14, 32, 3, 0x333333);
    const mpBar = this.add.rectangle(-16, 14, 32, 3, 0x4444aa);
    mpBar.setOrigin(0, 0.5);

    const atbBarBg = this.add.rectangle(0, 20, 32, 2, 0x333333);
    const atbBar = this.add.rectangle(-16, 20, 0, 2, 0xffff00);
    atbBar.setOrigin(0, 0.5);

    const hpText = this.add.text(0, 8, `${entity.hp}/${entity.maxHp}`, uiTextStyle({
      fontSize: '6px',
      color: '#ffffff',
    }));
    hpText.setOrigin(0.5);

    container.add([sprite, nameText, elementText, hpBarBg, hpBar, mpBarBg, mpBar, atbBarBg, atbBar, hpText]);

    const display: EntityDisplay = {
      container,
      sprite,
      nameText,
      hpBar,
      hpBarBg,
      mpBar,
      mpBarBg,
      atbBar,
      atbBarBg,
      buffIcons: [],
    };

    this.entityDisplays.set(entity.id, display);
  }

  private createMenu(): void {
    this.menuContainer = this.add.container(160, 155);
    this.menuContainer.setVisible(false);
    this.menuContainer.setDepth(10);

    const bg = this.add.rectangle(0, 0, 120, 40, 0x000000, 0.85);
    bg.setStrokeStyle(1, 0x888888);
    this.menuContainer.add(bg);

    for (let i = 0; i < MENU_OPTIONS.length; i++) {
      const text = this.add.text(-50, -14 + i * 10, MENU_OPTIONS[i], uiTextStyle({
        fontSize: '8px',
        color: '#aaaaaa',
      }));
      this.menuItems.push(text);
      this.menuContainer.add(text);
    }
  }

  private createBattleLog(): void {
    this.battleLog = this.add.text(160, 12, '', uiTextStyle({
      fontSize: '8px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 300 },
    }));
    this.battleLog.setOrigin(0.5, 0);
    this.battleLog.setDepth(10);
  }

  private createSwordIntentDisplay(): void {
    const container = this.add.container(40, 155);
    container.setDepth(10);

    const label = this.add.text(0, -9, '剑意', uiTextStyle({
      fontSize: '7px',
      color: '#ffcc00',
    }));
    label.setOrigin(0.5);

    const barBg = this.add.rectangle(0, 0, 40, 4, 0x333333);
    this.swordIntentBar = this.add.rectangle(-20, 0, 0, 4, 0xffaa00);
    this.swordIntentBar.setOrigin(0, 0.5);

    this.swordIntentText = this.add.text(0, 7, '0/100', uiTextStyle({
      fontSize: '7px',
      color: '#ffcc00',
    }));
    this.swordIntentText.setOrigin(0.5);

    container.add([label, barBg, this.swordIntentBar, this.swordIntentText]);
  }

  private setupBattleEvents(): void {
    this.battleSystem.on('turn_ready', (event: BattleEvent) => {
      if (event.type === 'turn_ready') {
        const entity = this.battleSystem.getEntity(event.entityId);
        if (entity?.isPlayer) {
          this.showActionMenu();
        } else if (entity) {
          this.isProcessing = true;
          this.time.delayedCall(400, () => {
            const action = this.battleSystem.getEnemyAction(entity.id);
            this.battleSystem.executeAction(entity.id, action);
            this.isProcessing = false;
          });
        }
      }
    });

    this.battleSystem.on('damage_dealt', (event: BattleEvent) => {
      if (event.type === 'damage_dealt') {
        const target = this.battleSystem.getEntity(event.targetId);
        const isCrit = event.isCritical ?? false;
        this.addLog(`${target?.name} 受到 ${event.damage} 点伤害${isCrit ? '（暴击！）' : ''}`);
        this.flashEntity(event.targetId, 0xff0000);
        this.updateEntityDisplay(event.targetId);
        if (isCrit) {
          this.audioSystem.playSFX('crit');
          this.shakeEntity(event.targetId, 6, 80, 3);
          this.shakeCamera(100, 0.003);
          this.spawnParticles(event.targetId, 0xff0000, 12);
        } else {
          this.audioSystem.playSFX('hit');
          this.shakeEntity(event.targetId);
        }
      }
    });

    this.battleSystem.on('heal', (event: BattleEvent) => {
      if (event.type === 'heal') {
        const target = this.battleSystem.getEntity(event.targetId);
        this.addLog(`${target?.name} 恢复 ${event.amount} 点生命`);
        this.flashEntity(event.targetId, 0x00ff00);
        this.updateEntityDisplay(event.targetId);
        this.audioSystem.playSFX('heal');
      }
    });

    this.battleSystem.on('mp_changed', (event: BattleEvent) => {
      if (event.type === 'mp_changed') {
        this.updateEntityDisplay(event.entityId);
      }
    });

    this.battleSystem.on('sword_intent_changed', (event: BattleEvent) => {
      if (event.type === 'sword_intent_changed') {
        this.updateSwordIntentDisplay(event.value);
      }
    });

    this.battleSystem.on('buff_applied', (event: BattleEvent) => {
      if (event.type === 'buff_applied') {
        const target = this.battleSystem.getEntity(event.targetId);
        this.addLog(`${target?.name} 获得 ${this.getBuffName(event.buff.type)}`);
        this.updateBuffDisplay(event.targetId);
      }
    });

    this.battleSystem.on('buff_removed', (event: BattleEvent) => {
      if (event.type === 'buff_removed') {
        const target = this.battleSystem.getEntity(event.targetId);
        this.addLog(`${target?.name} 的 ${this.getBuffName(event.buffType)} 消失`);
        this.updateBuffDisplay(event.targetId);
      }
    });

    this.battleSystem.on('buff_tick', (event: BattleEvent) => {
      if (event.type === 'buff_tick') {
        const target = this.battleSystem.getEntity(event.targetId);
        if (event.damage) {
          this.addLog(`${target?.name} 受到 ${event.damage} 点毒伤`);
          this.flashEntity(event.targetId, 0x880088);
        }
        if (event.heal) {
          this.addLog(`${target?.name} 恢复 ${event.heal} 点生命`);
        }
        this.updateEntityDisplay(event.targetId);
      }
    });

    this.battleSystem.on('entity_defeated', (event: BattleEvent) => {
      if (event.type === 'entity_defeated') {
        const entity = this.battleSystem.getEntity(event.entityId);
        this.addLog(`${entity?.name} 倒下了`);
        this.spawnParticles(event.entityId, 0xaaaaaa, 20, 600);
        this.fadeOutEntity(event.entityId);
        const isEnemy = this.battleSystem.getAllEntities().some((e: BattleEntity) => !e.isPlayer && e.id === event.entityId);
        this.audioSystem.playSFX(isEnemy ? 'victory' : 'defeat');
      }
    });

    this.battleSystem.on('defend', (event: BattleEvent) => {
      if (event.type === 'defend') {
        const entity = this.battleSystem.getEntity(event.entityId);
        this.addLog(`${entity?.name} 进入防御姿态`);
        this.flashEntity(event.entityId, 0x8888ff);
      }
    });

    this.battleSystem.on('flee_attempted', (event: BattleEvent) => {
      if (event.type === 'flee_attempted') {
        this.audioSystem.playSFX('flee');
        if (event.success) {
          this.addLog('成功逃跑！');
        } else {
          this.addLog('逃跑失败！');
          this.isProcessing = false;
        }
      }
    });

    this.battleSystem.on('combo_triggered', (event: BattleEvent) => {
      if (event.type === 'combo_triggered') {
        const combo = this.battleSystem.getComboData(event.comboId);
        this.addLog(`Combo！${combo?.name}`);
      }
    });

    this.battleSystem.on('battle_ended', (event: BattleEvent) => {
      if (event.type === 'battle_ended') {
        this.audioSystem.playSFX(event.result === 'victory' ? 'victory' : 'defeat');
        this.handleBattleEnd(event.result, event.rewards);
      }
    });
  }

  private handleMenuInput(): void {
    if (this.menuState === 'hidden' || this.menuState === 'executing' || this.menuState === 'ended') return;

    const justDown = Phaser.Input.Keyboard.JustDown;

    if (this.menuState === 'action') {
      if (justDown(this.cursors.up)) {
        this.selectedMenuIndex = (this.selectedMenuIndex - 1 + MENU_OPTIONS.length) % MENU_OPTIONS.length;
        this.audioSystem.playSFX('ui_click');
        this.updateMenuSelection();
      }
      if (justDown(this.cursors.down)) {
        this.selectedMenuIndex = (this.selectedMenuIndex + 1) % MENU_OPTIONS.length;
        this.audioSystem.playSFX('ui_click');
        this.updateMenuSelection();
      }
      if (justDown(this.confirmKey)) {
        this.audioSystem.playSFX('ui_confirm');
        this.selectAction(this.selectedMenuIndex);
      }
      return;
    }

    if (this.menuState === 'target') {
      const aliveEnemies = this.battleSystem.getAliveEnemies();
      if (justDown(this.cursors.up)) {
        this.selectedTargetIndex = (this.selectedTargetIndex - 1 + aliveEnemies.length) % aliveEnemies.length;
        this.audioSystem.playSFX('ui_click');
        this.updateTargetSelection();
      }
      if (justDown(this.cursors.down)) {
        this.selectedTargetIndex = (this.selectedTargetIndex + 1) % aliveEnemies.length;
        this.audioSystem.playSFX('ui_click');
        this.updateTargetSelection();
      }
      if (justDown(this.confirmKey)) {
        this.audioSystem.playSFX('ui_confirm');
        const target = aliveEnemies[this.selectedTargetIndex];
        this.executePlayerAction(target.id);
      }
      if (justDown(this.cancelKey)) {
        this.audioSystem.playSFX('ui_cancel');
        this.hideTargetSelection();
        this.showActionMenu();
      }
      return;
    }

    if (this.menuState === 'skill') {
      if (justDown(this.cursors.up)) {
        this.selectedMenuIndex = (this.selectedMenuIndex - 1 + this.skillList.length) % this.skillList.length;
        this.audioSystem.playSFX('ui_click');
        this.updateMenuSelection();
      }
      if (justDown(this.cursors.down)) {
        this.selectedMenuIndex = (this.selectedMenuIndex + 1) % this.skillList.length;
        this.audioSystem.playSFX('ui_click');
        this.updateMenuSelection();
      }
      if (justDown(this.confirmKey)) {
        this.audioSystem.playSFX('ui_confirm');
        const skill = this.skillList[this.selectedMenuIndex];
        this.selectSkill(skill);
      }
      if (justDown(this.cancelKey)) {
        this.audioSystem.playSFX('ui_cancel');
        this.showActionMenu();
      }
      return;
    }
  }

  private showActionMenu(): void {
    this.menuState = 'action';
    this.selectedMenuIndex = 0;
    this.menuContainer.setVisible(true);
    this.menuItems.forEach((item, i) => {
      item.setText(MENU_OPTIONS[i]);
      item.setColor('#aaaaaa');
    });
    this.updateMenuSelection();

    const player = this.battleSystem.getPlayer();
    const canUltimate = player.swordIntent >= 100;
    this.menuItems[2].setText(canUltimate ? '剑诀 (本命)' : '剑诀');
  }

  private hideMenu(): void {
    this.menuContainer.setVisible(false);
    this.menuItems.forEach((item) => item.setColor('#aaaaaa'));
  }

  private updateMenuSelection(): void {
    const items = this.menuState === 'skill' ? this.skillList.length : MENU_OPTIONS.length;
    for (let i = 0; i < items; i++) {
      const text = this.menuItems[i];
      if (i === this.selectedMenuIndex) {
        text.setColor('#ffffff');
        text.setText('> ' + text.text.replace(/^> /, ''));
      } else {
        text.setColor('#aaaaaa');
        text.setText(text.text.replace(/^> /, ''));
      }
    }
  }

  private selectAction(index: number): void {
    switch (index) {
      case 0: // 攻击
        this.pendingAction = { type: 'attack' };
        this.showTargetSelection();
        break;
      case 1: // 防御
        this.hideMenu();
        this.menuState = 'executing';
        this.battleSystem.executeAction(this.battleSystem.getPlayer().id, { type: 'defend' });
        break;
      case 2: // 剑诀
        this.showSkillMenu();
        break;
      case 3: // 逃跑
        this.hideMenu();
        this.menuState = 'executing';
        this.battleSystem.executeAction(this.battleSystem.getPlayer().id, { type: 'flee' });
        break;
    }
  }

  private showSkillMenu(): void {
    const player = this.battleSystem.getPlayer();
    this.skillList = player.skills
      .map((sid) => this.battleSystem.getSkillData(sid))
      .filter((s): s is SkillData => s !== undefined && player.mp >= s.mpCost);

    if (player.swordIntent >= 100) {
      const ultimate = this.battleSystem.getSkillData('life_sword');
      if (ultimate) this.skillList.push(ultimate);
    }

    if (this.skillList.length === 0) {
      this.addLog('MP 不足，无法使用剑诀');
      return;
    }

    this.menuState = 'skill';
    this.selectedMenuIndex = 0;
    this.menuContainer.setVisible(true);

    for (let i = 0; i < this.menuItems.length; i++) {
      if (i < this.skillList.length) {
        const skill = this.skillList[i];
        this.menuItems[i].setText(`${skill.name} (${skill.mpCost}MP)`);
        this.menuItems[i].setVisible(true);
      } else {
        this.menuItems[i].setVisible(false);
      }
    }
    this.updateMenuSelection();
  }

  private selectSkill(skill: SkillData): void {
    if (skill.isUltimate) {
      this.pendingAction = { type: 'ultimate' };
    } else {
      this.pendingAction = { type: 'skill', skillId: skill.id };
    }

    if (skill.targetType === 'self') {
      this.executePlayerAction(this.battleSystem.getPlayer().id);
    } else if (skill.targetType === 'all') {
      const enemies = this.battleSystem.getAliveEnemies();
      if (enemies.length > 0) {
        this.executePlayerAction(enemies[0].id);
      }
    } else {
      this.showTargetSelection();
    }
  }

  private showTargetSelection(): void {
    this.hideMenu();
    this.menuState = 'target';
    this.selectedTargetIndex = 0;
    const aliveEnemies = this.battleSystem.getAliveEnemies();

    for (const enemy of aliveEnemies) {
      const display = this.entityDisplays.get(enemy.id);
      if (display) {
        const arrow = this.add.triangle(
          display.container.x - 20,
          display.container.y - 8,
          0, 0,
          8, 4,
          0, 8,
          0xffff00
        );
        arrow.setVisible(false);
        this.targetArrows.push(arrow);
      }
    }
    this.updateTargetSelection();
  }

  private hideTargetSelection(): void {
    for (const arrow of this.targetArrows) {
      arrow.destroy();
    }
    this.targetArrows = [];
  }

  private updateTargetSelection(): void {
    for (let i = 0; i < this.targetArrows.length; i++) {
      this.targetArrows[i].setVisible(i === this.selectedTargetIndex);
    }
  }

  private executePlayerAction(targetId: string): void {
    this.hideTargetSelection();
    this.hideMenu();
    this.menuState = 'executing';
    this.isProcessing = true;

    const action: BattleAction =
      this.pendingAction?.type === 'attack'
        ? { type: 'attack', targetId }
        : this.pendingAction?.type === 'skill'
          ? { type: 'skill', skillId: this.pendingAction.skillId!, targetId }
          : this.pendingAction?.type === 'ultimate'
            ? { type: 'ultimate', targetId }
            : { type: 'attack', targetId };

    this.time.delayedCall(300, () => {
      this.battleSystem.executeAction(this.battleSystem.getPlayer().id, action);
      this.pendingAction = undefined;
      this.isProcessing = false;
      this.menuState = 'hidden';
    });
  }

  private handleBattleEnd(result: BattleResult, rewards?: { exp: number; drops: { itemId: string; quantity: number }[] }): void {
    this.menuState = 'ended';

    if (result === 'victory') {
      this.addLog(`战斗胜利！获得 ${rewards?.exp ?? 0} 经验`);
      if (rewards && rewards.drops.length > 0) {
        for (const drop of rewards.drops) {
          this.addLog(`获得 ${drop.itemId} x${drop.quantity}`);
        }
      }
    } else if (result === 'defeat') {
      this.addLog('战斗失败……');
    }

    this.time.delayedCall(1500, () => {
      if (result === 'defeat') {
        this.scene.start('GameOverScene', { returnScene: this.returnScene });
      } else {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.start(this.returnScene);
        });
      }
    });
  }

  private updateATBBars(): void {
    for (const entity of this.battleSystem.getAllEntities()) {
      const display = this.entityDisplays.get(entity.id);
      if (display) {
        const ratio = Math.min(1, entity.atbGauge / 1000);
        display.atbBar.width = 32 * ratio;
      }
    }
  }

  private updateEntityDisplay(entityId: string): void {
    const entity = this.battleSystem.getEntity(entityId);
    const display = this.entityDisplays.get(entityId);
    if (!entity || !display) return;

    const hpRatio = entity.hp / entity.maxHp;
    display.hpBar.width = 32 * hpRatio;
    display.hpBar.fillColor = hpRatio > 0.5 ? 0x44aa44 : hpRatio > 0.25 ? 0xaaaa44 : 0xaa4444;

    const mpRatio = entity.mp / entity.maxMp;
    display.mpBar.width = 32 * mpRatio;

    display.atbBar.width = 32 * Math.min(1, entity.atbGauge / 1000);
  }

  private updateSwordIntentDisplay(value: number): void {
    const ratio = value / 100;
    this.swordIntentBar.width = 40 * ratio;
    this.swordIntentBar.fillColor = value >= 100 ? 0xff6600 : 0xffaa00;
    this.swordIntentText.setText(`${value}/100`);
  }

  private updateBuffDisplay(entityId: string): void {
    const entity = this.battleSystem.getEntity(entityId);
    const display = this.entityDisplays.get(entityId);
    if (!entity || !display) return;

    for (const icon of display.buffIcons) {
      icon.destroy();
    }
    display.buffIcons = [];

    for (let i = 0; i < entity.buffs.length; i++) {
      const buff = entity.buffs[i];
      const icon = this.add.text(
        display.container.x + 18,
        display.container.y - 20 + i * 6,
        this.getBuffName(buff.type),
        uiTextStyle({ fontSize: '6px', color: '#ffff00' })
      );
      display.buffIcons.push(icon);
    }
  }

  private flashEntity(entityId: string, color: number): void {
    const display = this.entityDisplays.get(entityId);
    if (!display) return;

    // Only flash if sprite is a rectangle (not an image)
    if (display.sprite instanceof Phaser.GameObjects.Rectangle) {
      const rect = display.sprite;
      const originalColor = rect.fillColor;
      rect.setFillStyle(color);
      this.time.delayedCall(150, () => {
        rect.setFillStyle(originalColor);
      });
    }
  }

  private shakeEntity(entityId: string, amplitude = 3, duration = 50, repeat = 2): void {
    const display = this.entityDisplays.get(entityId);
    if (!display) return;

    const originalX = display.container.x;
    this.tweens.add({
      targets: display.container,
      x: originalX + amplitude,
      duration,
      yoyo: true,
      repeat,
      onComplete: () => {
        display.container.x = originalX;
      },
    });
  }

  private shakeCamera(duration = 100, intensity = 0.003): void {
    this.cameras.main.shake(duration, intensity);
  }

  private spawnParticles(entityId: string, color: number, count = 8, lifespan = 400): void {
    const display = this.entityDisplays.get(entityId);
    if (!display) return;

    const cx = display.container.x;
    const cy = display.container.y;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 20 + Math.random() * 40;
      const px = cx + Math.cos(angle) * 8;
      const py = cy + Math.sin(angle) * 8;

      const p = this.add.rectangle(px, py, 2, 2, color);
      p.setDepth(10);
      this.tweens.add({
        targets: p,
        x: px + Math.cos(angle) * speed,
        y: py + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.5,
        duration: lifespan,
        ease: 'Power2',
        onComplete: () => p.destroy(),
      });
    }
  }

  private fadeOutEntity(entityId: string): void {
    const display = this.entityDisplays.get(entityId);
    if (!display) return;

    this.tweens.add({
      targets: display.container,
      alpha: 0,
      duration: 500,
    });
  }

  private addLog(message: string): void {
    this.logEntries.push(message);
    if (this.logEntries.length > 3) {
      this.logEntries.shift();
    }
    this.battleLog.setText(this.logEntries.join('\n'));
  }

  private getBackgroundKey(battleGroupId: string): string {
    const bgMap: Record<string, string> = {
      demo_forest: 'bg_battle_forest',
      demo_cave: 'bg_battle_cave',
      demo_volcano: 'bg_battle_cave',
      demo_river: 'bg_battle_forest',
      demo_mixed: 'bg_battle_forest',
      ch1_woods: 'bg_battle_forest',
      ch1_deep_woods: 'bg_battle_forest',
      ch1_corruption: 'bg_battle_cave',
    };
    return bgMap[battleGroupId] ?? 'bg_battle_forest';
  }

  private getEnemySpriteKey(enemyId: string): string | null {
    const spriteMap: Record<string, string> = {
      spirit_wolf: 'enemy_wolf',
      dark_spy: 'enemy_shadow_clone',
      corrupted_spirit: 'enemy_elder_1',
      wood_spirit: 'enemy_spirit',
      stone_golem: 'enemy_bandit',
      flame_fox: 'enemy_spirit',
      water_serpent: 'enemy_spirit',
      metal_blade: 'enemy_bandit',
    };
    return spriteMap[enemyId] ?? null;
  }

  private getElementColor(element: FiveElement): string {
    const colors: Record<FiveElement, string> = {
      metal: '#cccccc',
      wood: '#44cc44',
      earth: '#cc8844',
      water: '#4444cc',
      fire: '#cc4444',
    };
    return colors[element];
  }

  private getBuffName(buffType: Buff['type']): string {
    const names: Record<Buff['type'], string> = {
      atk_up: '攻↑',
      atk_down: '攻↓',
      def_up: '防↑',
      def_down: '防↓',
      spd_up: '速↑',
      spd_down: '速↓',
      regen: '再生',
      poison: '毒',
      stun: '眩晕',
    };
    return names[buffType] ?? buffType;
  }
}
