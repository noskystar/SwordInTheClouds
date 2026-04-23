import { EventEmitter } from '../utils/event-emitter';
import type {
  BattleEntity,
  BattleAction,
  BattleEvent,
  BattleResult,
  BattleReward,
  Buff,
  ComboSkillData,
  EnemyData,
  FiveElement,
  SkillData,
} from '../types/battle';

export const ATB_GAUGE_MAX = 1000;
export const ATB_FACTOR = 0.01;
export const SWORD_INTENT_MAX = 100;
export const SWORD_INTENT_ON_ATTACK = 10;
export const SWORD_INTENT_ON_TAKE_DAMAGE = 5;
export const SWORD_INTENT_ON_SKILL = 5;
export const DEFEND_DAMAGE_REDUCTION = 0.5;
export const ELEMENT_ADVANTAGE = 1.3;
export const ELEMENT_DISADVANTAGE = 0.7;
export const BASE_FLEE_CHANCE = 0.5;

const ELEMENT_ADVANTAGE_MAP: Record<FiveElement, FiveElement> = {
  metal: 'wood',
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
};

export interface PlayerBattleStats {
  id: string;
  name: string;
  level: number;
  maxHp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  element: FiveElement;
  skills: string[];
  color: number;
}

export class BattleSystem {
  private eventEmitter = new EventEmitter();
  private entities = new Map<string, BattleEntity>();
  private playerId: string;
  private turnState: 'idle' | 'waiting_for_player' | 'executing' | 'ended' = 'idle';
  private battleResult?: BattleResult;
  private rewards?: BattleReward;
  private skillData = new Map<string, SkillData>();
  private comboData = new Map<string, ComboSkillData>();
  private recentActions: { entityId: string; element: FiveElement; actionType: string }[] = [];
  private defendingEntities = new Set<string>();
  private pendingTurnEntityId?: string;
  private currentActionType?: string;
  private enemyDataList: EnemyData[] = [];

  constructor(
    player: PlayerBattleStats,
    enemies: EnemyData[],
    skills: SkillData[],
    combos: ComboSkillData[]
  ) {
    this.playerId = player.id;
    this.enemyDataList = enemies;

    for (const skill of skills) {
      this.skillData.set(skill.id, skill);
    }
    for (const combo of combos) {
      this.comboData.set(combo.id, combo);
    }

    const playerEntity: BattleEntity = {
      ...player,
      hp: player.maxHp,
      mp: player.maxMp,
      isPlayer: true,
      atbGauge: 0,
      isAlive: true,
      buffs: [],
      swordIntent: 0,
    };
    this.entities.set(player.id, playerEntity);

    for (const enemy of enemies) {
      const enemyEntity: BattleEntity = {
        id: `${enemy.id}_${Math.random().toString(36).slice(2, 7)}`,
        name: enemy.name,
        isPlayer: false,
        level: enemy.level,
        hp: enemy.maxHp,
        maxHp: enemy.maxHp,
        mp: enemy.maxMp,
        maxMp: enemy.maxMp,
        attack: enemy.attack,
        defense: enemy.defense,
        speed: enemy.speed,
        element: enemy.element,
        atbGauge: 0,
        isAlive: true,
        buffs: [],
        skills: [...enemy.skills],
        color: enemy.color,
        swordIntent: 0,
      };
      this.entities.set(enemyEntity.id, enemyEntity);
    }
  }

  on<T = BattleEvent>(event: string, callback: (data: T) => void): void {
    this.eventEmitter.on(event, callback);
  }

  off<T = BattleEvent>(event: string, callback: (data: T) => void): void {
    this.eventEmitter.off(event, callback);
  }

  private emit(event: string, data?: unknown): void {
    this.eventEmitter.emit(event, data);
  }

  startBattle(): void {
    this.turnState = 'idle';
    this.battleResult = undefined;
    this.rewards = undefined;
  }

  tick(delta: number): string | null {
    if (this.turnState === 'ended' || this.turnState === 'waiting_for_player' || this.turnState === 'executing') {
      return this.pendingTurnEntityId ?? null;
    }

    let readyEntityId: string | null = null;
    let highestGauge = -1;

    for (const entity of this.entities.values()) {
      if (!entity.isAlive) continue;
      if (entity.buffs.some((b) => b.type === 'stun')) continue;

      entity.atbGauge += entity.speed * delta * ATB_FACTOR;

      if (entity.atbGauge >= ATB_GAUGE_MAX && entity.atbGauge > highestGauge) {
        highestGauge = entity.atbGauge;
        readyEntityId = entity.id;
      }
    }

    if (readyEntityId) {
      this.pendingTurnEntityId = readyEntityId;
      const entity = this.entities.get(readyEntityId)!;
      entity.atbGauge = 0;

      this.tickBuffsAtTurnStart(entity);
      if (!entity.isAlive) {
        return readyEntityId;
      }
      this.applyDefendBonus(entity);

      this.emit('turn_ready', { entityId: readyEntityId } as BattleEvent);

      if (entity.isPlayer) {
        this.turnState = 'waiting_for_player';
      } else {
        this.turnState = 'executing';
      }
    }

    return readyEntityId;
  }

  executeAction(entityId: string, action: BattleAction): void {
    const entity = this.entities.get(entityId);
    if (!entity || !entity.isAlive || this.turnState === 'ended') return;

    this.currentActionType = action.type;
    this.emit('action_executed', { entityId, action } as BattleEvent);

    switch (action.type) {
      case 'attack':
        this.handleAttack(entity, action.targetId);
        break;
      case 'defend':
        this.handleDefend(entity);
        break;
      case 'flee':
        this.handleFlee(entity);
        return;
      case 'skill':
        this.handleSkill(entity, action.skillId, action.targetId);
        break;
      case 'ultimate':
        this.handleUltimate(entity, action.targetId);
        break;
    }

    this.checkComboTrigger(entity);
    this.endTurn(entityId);
  }

  private handleAttack(source: BattleEntity, targetId: string): void {
    const target = this.entities.get(targetId);
    if (!target || !target.isAlive) return;

    const damage = this.calculateDamage(source, target, source.attack, source.element);
    this.applyDamage(source.id, target, damage);
    this.addSwordIntent(source.id, SWORD_INTENT_ON_ATTACK);
    this.recordAction(source.id, source.element, 'attack');
  }

  private handleDefend(entity: BattleEntity): void {
    this.defendingEntities.add(entity.id);
    this.emit('defend', { entityId: entity.id } as BattleEvent);
    this.recordAction(entity.id, entity.element, 'defend');
  }

  private handleFlee(entity: BattleEntity): void {
    const aliveEnemies = this.getAliveEnemies();
    const avgEnemyLevel = aliveEnemies.reduce((sum, e) => sum + e.level, 0) / aliveEnemies.length;
    const levelDiff = entity.level - avgEnemyLevel;
    const fleeChance = Math.min(0.9, Math.max(0.1, BASE_FLEE_CHANCE + levelDiff * 0.05));
    const success = Math.random() < fleeChance;

    this.emit('flee_attempted', { success } as BattleEvent);

    if (success) {
      this.battleResult = 'fled';
      this.turnState = 'ended';
      this.emit('battle_ended', { result: 'fled' } as BattleEvent);
    }
  }

  private handleSkill(source: BattleEntity, skillId: string, targetId?: string): void {
    const skill = this.skillData.get(skillId);
    if (!skill) return;
    if (source.mp < skill.mpCost) return;

    source.mp -= skill.mpCost;
    this.emit('mp_changed', { entityId: source.id, delta: -skill.mpCost } as BattleEvent);

    if (skill.targetType === 'self') {
      if (skill.power > 0 && skill.element === 'water') {
        this.applyHeal(source, skill.power + source.level * 2);
      }
    } else if (skill.targetType === 'all') {
      for (const target of this.entities.values()) {
        if (target.id === source.id) continue;
        if (!target.isAlive) continue;
        const damage = this.calculateDamage(source, target, skill.power, skill.element);
        this.applyDamage(source.id, target, damage);
      }
    } else {
      const target = targetId ? this.entities.get(targetId) : null;
      if (target && target.isAlive) {
        const damage = this.calculateDamage(source, target, skill.power, skill.element);
        this.applyDamage(source.id, target, damage);
      }
    }

    this.addSwordIntent(source.id, SWORD_INTENT_ON_SKILL);
    this.recordAction(source.id, skill.element, 'skill');
  }

  private handleUltimate(source: BattleEntity, targetId?: string): void {
    if (source.swordIntent < SWORD_INTENT_MAX) return;

    source.swordIntent = 0;
    this.emit('sword_intent_changed', { entityId: source.id, value: 0 } as BattleEvent);

    const power = 80 + source.level * 5;
    const target = targetId ? this.entities.get(targetId) : null;

    if (target && target.isAlive) {
      const damage = this.calculateDamage(source, target, power, source.element);
      this.applyDamage(source.id, target, damage);
    } else {
      const enemies = this.getAliveEnemies();
      if (enemies.length > 0) {
        const randomTarget = enemies[Math.floor(Math.random() * enemies.length)];
        const damage = this.calculateDamage(source, randomTarget, power, source.element);
        this.applyDamage(source.id, randomTarget, damage);
      }
    }

    this.recordAction(source.id, source.element, 'ultimate');
  }

  calculateDamage(
    source: BattleEntity,
    target: BattleEntity,
    power: number,
    element: FiveElement
  ): number {
    const effectiveAttack = this.getEffectiveStat(source, 'attack');
    const effectiveDefense = this.getEffectiveStat(target, 'defense');
    let damage = Math.max(1, Math.floor(power + effectiveAttack - effectiveDefense));

    const elementModifier = this.getElementModifier(element, target.element);
    damage = Math.floor(damage * elementModifier);

    if (this.defendingEntities.has(target.id)) {
      damage = Math.floor(damage * DEFEND_DAMAGE_REDUCTION);
    }

    const variance = 0.9 + Math.random() * 0.2;
    damage = Math.max(1, Math.floor(damage * variance));

    return damage;
  }

  getElementModifier(attackerElement: FiveElement, targetElement: FiveElement): number {
    if (attackerElement === targetElement) return 1.0;
    if (ELEMENT_ADVANTAGE_MAP[attackerElement] === targetElement) return ELEMENT_ADVANTAGE;
    if (ELEMENT_ADVANTAGE_MAP[targetElement] === attackerElement) return ELEMENT_DISADVANTAGE;
    return 1.0;
  }

  private applyDamage(sourceId: string, target: BattleEntity, damage: number): void {
    target.hp = Math.max(0, target.hp - damage);
    this.emit('damage_dealt', { sourceId, targetId: target.id, damage } as BattleEvent);

    if (!target.isPlayer && this.currentActionType !== 'ultimate') {
      const player = this.entities.get(this.playerId)!;
      this.addSwordIntent(player.id, SWORD_INTENT_ON_TAKE_DAMAGE);
    }

    if (target.hp <= 0) {
      target.isAlive = false;
      target.atbGauge = 0;
      this.emit('entity_defeated', { entityId: target.id } as BattleEvent);
      this.checkBattleEnd();
    }
  }

  private applyHeal(target: BattleEntity, amount: number): void {
    const actualHeal = Math.min(amount, target.maxHp - target.hp);
    target.hp += actualHeal;
    this.emit('heal', { targetId: target.id, amount: actualHeal } as BattleEvent);
  }

  private addSwordIntent(entityId: string, amount: number): void {
    const entity = this.entities.get(entityId);
    if (!entity || !entity.isPlayer) return;
    entity.swordIntent = Math.min(SWORD_INTENT_MAX, entity.swordIntent + amount);
    this.emit('sword_intent_changed', { entityId, value: entity.swordIntent } as BattleEvent);
  }

  private applyDefendBonus(entity: BattleEntity): void {
    this.defendingEntities.delete(entity.id);
  }

  private tickBuffsAtTurnStart(entity: BattleEntity): void {
    for (const buff of [...entity.buffs]) {
      buff.duration -= 1;

      if (buff.type === 'poison') {
        const damage = Math.max(1, Math.floor(buff.value));
        entity.hp = Math.max(0, entity.hp - damage);
        this.emit('buff_tick', { targetId: entity.id, buffType: buff.type, damage } as BattleEvent);
        if (entity.hp <= 0) {
          entity.isAlive = false;
          this.emit('entity_defeated', { entityId: entity.id } as BattleEvent);
          this.checkBattleEnd();
          return;
        }
      } else if (buff.type === 'regen') {
        const healAmount = Math.floor(buff.value);
        const actualHeal = Math.min(healAmount, entity.maxHp - entity.hp);
        entity.hp += actualHeal;
        this.emit('buff_tick', { targetId: entity.id, buffType: buff.type, heal: actualHeal } as BattleEvent);
      }

      if (buff.duration <= 0) {
        entity.buffs = entity.buffs.filter((b) => b !== buff);
        this.emit('buff_removed', { targetId: entity.id, buffType: buff.type } as BattleEvent);
      }
    }
  }

  private checkBattleEnd(): void {
    const aliveEnemies = this.getAliveEnemies();
    const player = this.entities.get(this.playerId)!;

    if (!player.isAlive) {
      this.battleResult = 'defeat';
      this.turnState = 'ended';
      this.emit('battle_ended', { result: 'defeat' } as BattleEvent);
      return;
    }

    if (aliveEnemies.length === 0) {
      this.battleResult = 'victory';
      this.turnState = 'ended';
      this.rewards = this.calculateRewards();
      this.emit('battle_ended', { result: 'victory', rewards: this.rewards } as BattleEvent);
    }
  }

  private calculateRewards(): BattleReward {
    const enemies = this.getAllEntities().filter((e) => !e.isPlayer);
    let totalExp = 0;
    const drops: { itemId: string; quantity: number }[] = [];

    const enemyDataMap = new Map(this.enemyDataList.map((e) => [e.id, e]));
    for (const enemy of enemies) {
      const enemyData = enemyDataMap.get(enemy.id);
      if (enemyData) {
        totalExp += enemyData.expReward;
        for (const drop of enemyData.dropItems) {
          if (Math.random() < drop.chance) {
            const qty = drop.minQuantity + Math.floor(Math.random() * (drop.maxQuantity - drop.minQuantity + 1));
            drops.push({ itemId: drop.itemId, quantity: qty });
          }
        }
      }
    }

    return { exp: totalExp, drops };
  }

  getEnemyAction(entityId: string): BattleAction {
    const entity = this.entities.get(entityId);
    if (!entity || !entity.isAlive) return { type: 'defend' };

    const player = this.entities.get(this.playerId)!;

    if (!player.isAlive) return { type: 'defend' };

    const usableSkills = entity.skills
      .map((sid) => this.skillData.get(sid))
      .filter((s): s is SkillData => s !== undefined && entity.mp >= s.mpCost);

    if (usableSkills.length > 0 && Math.random() < 0.4) {
      const skill = usableSkills[Math.floor(Math.random() * usableSkills.length)];
      if (skill.targetType === 'all' || skill.targetType === 'self') {
        return { type: 'skill', skillId: skill.id };
      }
      return { type: 'skill', skillId: skill.id, targetId: player.id };
    }

    return { type: 'attack', targetId: player.id };
  }

  private recordAction(entityId: string, element: FiveElement, actionType: string): void {
    this.recentActions.push({ entityId, element, actionType });
    if (this.recentActions.length > 10) {
      this.recentActions.shift();
    }
  }

  private checkComboTrigger(entity: BattleEntity): void {
    if (!entity.isPlayer) return;

    for (const combo of this.comboData.values()) {
      if (this.checkComboCondition(combo)) {
        this.emit('combo_triggered', { comboId: combo.id, entityIds: [entity.id] } as BattleEvent);
        break;
      }
    }
  }

  private checkComboCondition(combo: ComboSkillData): boolean {
    const player = this.entities.get(this.playerId);
    if (!player) return false;

    if (combo.condition.minSwordIntent && player.swordIntent < combo.condition.minSwordIntent) {
      return false;
    }

    const recentElements = new Set(
      this.recentActions
        .filter((a) => a.entityId === this.playerId)
        .map((a) => a.element)
    );

    for (const reqElement of combo.condition.requiredElements) {
      if (!recentElements.has(reqElement)) return false;
    }

    if (combo.condition.requiredBuffs) {
      for (const reqBuff of combo.condition.requiredBuffs) {
        if (!player.buffs.some((b) => b.type === reqBuff)) return false;
      }
    }

    return true;
  }

  applyBuff(targetId: string, buff: Buff): void {
    const target = this.entities.get(targetId);
    if (!target || !target.isAlive) return;

    const existing = target.buffs.find((b) => b.type === buff.type);
    if (existing) {
      existing.duration = Math.max(existing.duration, buff.duration);
      existing.value = Math.max(existing.value, buff.value);
    } else {
      target.buffs.push({ ...buff });
    }

    this.emit('buff_applied', { targetId, buff } as BattleEvent);
  }

  private endTurn(_entityId: string): void {
    this.pendingTurnEntityId = undefined;
    this.currentActionType = undefined;

    if (this.turnState !== 'ended') {
      this.turnState = 'idle';
    }
  }

  getEffectiveStat(entity: BattleEntity, stat: 'attack' | 'defense' | 'speed'): number {
    let value = entity[stat];
    const buffMap: Record<string, number> = {};

    for (const buff of entity.buffs) {
      const key = buff.type;
      buffMap[key] = (buffMap[key] ?? 0) + buff.value;
    }

    if (stat === 'attack') {
      value += (buffMap['atk_up'] ?? 0) - (buffMap['atk_down'] ?? 0);
    } else if (stat === 'defense') {
      value += (buffMap['def_up'] ?? 0) - (buffMap['def_down'] ?? 0);
    } else if (stat === 'speed') {
      value += (buffMap['spd_up'] ?? 0) - (buffMap['spd_down'] ?? 0);
    }

    return Math.max(1, Math.floor(value));
  }

  getEntity(id: string): BattleEntity | undefined {
    return this.entities.get(id);
  }

  getPlayer(): BattleEntity {
    return this.entities.get(this.playerId)!;
  }

  getAliveEnemies(): BattleEntity[] {
    return Array.from(this.entities.values()).filter((e) => !e.isPlayer && e.isAlive);
  }

  getAllEntities(): BattleEntity[] {
    return Array.from(this.entities.values());
  }

  getTurnState(): string {
    return this.turnState;
  }

  getBattleResult(): BattleResult | undefined {
    return this.battleResult;
  }

  getRewards(): BattleReward | undefined {
    return this.rewards;
  }

  getSkillData(skillId: string): SkillData | undefined {
    return this.skillData.get(skillId);
  }

  getComboData(comboId: string): ComboSkillData | undefined {
    return this.comboData.get(comboId);
  }

  getRecentActions(): { entityId: string; element: FiveElement; actionType: string }[] {
    return [...this.recentActions];
  }

  getPendingTurnEntityId(): string | undefined {
    return this.pendingTurnEntityId;
  }

  setRewardsForTest(rewards: BattleReward): void {
    this.rewards = rewards;
  }

  setBattleResultForTest(result: BattleResult): void {
    this.battleResult = result;
    this.turnState = 'ended';
  }
}
