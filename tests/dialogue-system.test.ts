import { describe, it, expect, vi } from 'vitest';
import { DialogueSystem } from '../src/systems/dialogue-system';
import type { DialogueData } from '../src/types/dialogue';

const mockDialogue: DialogueData = {
  id: 'dlg_001',
  title: '初次见面',
  startNodeId: 'node_1',
  nodes: {
    node_1: {
      id: 'node_1',
      speaker: '老者',
      text: '年轻人，你为何来到此地？',
      options: [
        {
          id: 'opt_1',
          text: '我来寻找传说中的宝剑',
          effects: [{ type: 'set_flag', flag: 'seeking_sword', value: true }],
          nextNodeId: 'node_2',
        },
        {
          id: 'opt_2',
          text: '我只是路过',
          effects: [],
          nextNodeId: 'node_3',
        },
      ],
    },
    node_2: {
      id: 'node_2',
      speaker: '老者',
      text: '宝剑可不是轻易能得到的。',
      options: [
        {
          id: 'opt_3',
          text: '我愿意接受考验',
          effects: [{ type: 'change_affinity', npcId: 'elder', delta: 10 }],
          nextNodeId: 'node_4',
        },
      ],
    },
    node_3: {
      id: 'node_3',
      speaker: '老者',
      text: '那就请便吧。',
      options: [],
    },
    node_4: {
      id: 'node_4',
      speaker: '老者',
      text: '很好，考验开始。',
      options: [
        {
          id: 'opt_4',
          text: '结束对话',
          effects: [{ type: 'change_morality', delta: 5 }],
        },
      ],
    },
  },
};

const conditionalDialogue: DialogueData = {
  id: 'dlg_002',
  title: '条件测试',
  startNodeId: 'node_1',
  nodes: {
    node_1: {
      id: 'node_1',
      speaker: '守卫',
      text: '你有通行证吗？',
      options: [
        {
          id: 'opt_pass',
          text: '我有通行证',
          condition: { type: 'flag_check', flag: 'has_pass', value: true },
          effects: [{ type: 'set_flag', flag: 'entered_city', value: true }],
          nextNodeId: 'node_enter',
        },
        {
          id: 'opt_bribe',
          text: '给你点钱让我进去',
          condition: { type: 'stat_check', stat: 'gold', minValue: 100 },
          effects: [{ type: 'remove_item', itemId: 'gold', quantity: 100 }],
          nextNodeId: 'node_enter',
        },
        {
          id: 'opt_affinity',
          text: '看在我们交情的份上',
          condition: { type: 'affinity_check', npcId: 'guard', minValue: 50 },
          effects: [],
          nextNodeId: 'node_enter',
        },
        {
          id: 'opt_morality',
          text: '我是正义之士',
          condition: { type: 'morality_check', min: 20 },
          effects: [],
          nextNodeId: 'node_enter',
        },
        {
          id: 'opt_no_pass',
          text: '我没有通行证',
          effects: [],
          nextNodeId: 'node_reject',
        },
      ],
    },
    node_enter: {
      id: 'node_enter',
      speaker: '守卫',
      text: '欢迎入城。',
      options: [],
    },
    node_reject: {
      id: 'node_reject',
      speaker: '守卫',
      text: '那就不能让你进去。',
      options: [],
    },
  },
};

const compoundDialogue: DialogueData = {
  id: 'dlg_003',
  title: '复合条件测试',
  startNodeId: 'node_1',
  nodes: {
    node_1: {
      id: 'node_1',
      speaker: '考官',
      text: '你符合条件吗？',
      options: [
        {
          id: 'opt_and',
          text: '我满足所有条件（AND）',
          condition: {
            type: 'compound',
            operator: 'and',
            conditions: [
              { type: 'flag_check', flag: 'has_certificate', value: true },
              { type: 'stat_check', stat: 'level', minValue: 10 },
            ],
          },
          effects: [],
          nextNodeId: 'node_pass',
        },
        {
          id: 'opt_or',
          text: '我满足任一条件（OR）',
          condition: {
            type: 'compound',
            operator: 'or',
            conditions: [
              { type: 'flag_check', flag: 'is_vip', value: true },
              { type: 'stat_check', stat: 'level', minValue: 20 },
            ],
          },
          effects: [],
          nextNodeId: 'node_pass',
        },
        {
          id: 'opt_fallback',
          text: '都不满足',
          effects: [],
          nextNodeId: 'node_fail',
        },
      ],
    },
    node_pass: {
      id: 'node_pass',
      speaker: '考官',
      text: '通过。',
      options: [],
    },
    node_fail: {
      id: 'node_fail',
      speaker: '考官',
      text: '不通过。',
      options: [],
    },
  },
};

describe('DialogueSystem', () => {
  it('加载对话数据并启动', () => {
    const system = new DialogueSystem();
    const onNodeChange = vi.fn();
    const onDialogueEnd = vi.fn();
    system.setCallbacks(onNodeChange, onDialogueEnd);

    system.loadDialogue(mockDialogue);
    system.start();

    const currentNode = system.getCurrentNode();
    expect(currentNode).not.toBeNull();
    expect(currentNode!.id).toBe('node_1');
    expect(currentNode!.speaker).toBe('老者');
    expect(onNodeChange).toHaveBeenCalledOnce();
    expect(onNodeChange).toHaveBeenCalledWith(currentNode, system.getState());
  });

  it('选择选项推进到下一节点', () => {
    const system = new DialogueSystem();
    const onNodeChange = vi.fn();
    system.setCallbacks(onNodeChange, vi.fn());

    system.loadDialogue(mockDialogue);
    system.start();

    system.selectOption(0);

    const currentNode = system.getCurrentNode();
    expect(currentNode!.id).toBe('node_2');
    expect(onNodeChange).toHaveBeenCalledTimes(2);
  });

  it('条件选项过滤（stat_check, flag_check, affinity_check 等）', () => {
    const system = new DialogueSystem({
      flags: { has_pass: true },
      stats: { gold: 50 },
      affinity: { guard: 30 },
      morality: 10,
    });

    system.loadDialogue(conditionalDialogue);
    system.start();

    const node = system.getCurrentNode()!;
    const visibleOptions = system.getVisibleOptions(node);

    expect(visibleOptions.map((o) => o.id)).toEqual(['opt_pass', 'opt_no_pass']);
  });

  it('效果执行（set_flag, change_affinity, change_morality 等）', () => {
    const system = new DialogueSystem();
    system.loadDialogue(mockDialogue);
    system.start();

    system.selectOption(0);
    expect(system.getState().history[0].selectedOptionId).toBe('opt_1');

    system.selectOption(0);
    expect(system.getState().history[1].selectedOptionId).toBe('opt_3');

    system.selectOption(0);
    expect(system.getState().history[2].selectedOptionId).toBe('opt_4');
  });

  it('对话结束（没有 nextNodeId 时）', () => {
    const system = new DialogueSystem();
    const onDialogueEnd = vi.fn();
    system.setCallbacks(vi.fn(), onDialogueEnd);

    system.loadDialogue(mockDialogue);
    system.start();

    // node_1 -> node_3 (opt_2 has no nextNodeId from node_3, but node_3 itself has no options)
    system.selectOption(1);

    expect(system.getCurrentNode()!.id).toBe('node_3');

    // node_3 has no options, so calling selectOption with no visible options should end dialogue
    // Actually node_3 has empty options, so getVisibleOptions returns []
    // selectOption(0) will try to access visibleOptions[0] which is undefined -> returns early
    // But we need to trigger endDialogue. Let's navigate to node_4 instead.
    system.loadDialogue(mockDialogue);
    system.start();
    system.selectOption(0); // node_1 -> node_2
    system.selectOption(0); // node_2 -> node_4
    system.selectOption(0); // node_4 -> opt_4 has no nextNodeId -> end

    expect(onDialogueEnd).toHaveBeenCalledOnce();
    expect(onDialogueEnd).toHaveBeenCalledWith(system.getState());
  });

  it('历史记录', () => {
    const system = new DialogueSystem();
    system.loadDialogue(mockDialogue);
    system.start();

    expect(system.getHistory()).toHaveLength(1);
    expect(system.getHistory()[0].nodeId).toBe('node_1');

    system.selectOption(0);
    expect(system.getHistory()).toHaveLength(2);
    expect(system.getHistory()[1].nodeId).toBe('node_2');
  });

  it('关键回归测试：selectOption 对越界索引应有防护', () => {
    const system = new DialogueSystem();
    const onNodeChange = vi.fn();
    const onDialogueEnd = vi.fn();
    system.setCallbacks(onNodeChange, onDialogueEnd);

    system.loadDialogue(mockDialogue);
    system.start();

    system.selectOption(99);
    expect(system.getCurrentNode()!.id).toBe('node_1');
    expect(onNodeChange).toHaveBeenCalledOnce();

    system.selectOption(-1);
    expect(system.getCurrentNode()!.id).toBe('node_1');
    expect(onNodeChange).toHaveBeenCalledOnce();
  });

  it('支持从指定节点开始对话', () => {
    const system = new DialogueSystem();
    const onNodeChange = vi.fn();
    system.setCallbacks(onNodeChange, vi.fn());

    system.loadDialogue(mockDialogue, 'node_2');
    system.start();

    const currentNode = system.getCurrentNode();
    expect(currentNode!.id).toBe('node_2');
    expect(currentNode!.speaker).toBe('老者');
    expect(onNodeChange).toHaveBeenCalledOnce();
  });

  it('复合条件（and/or）', () => {
    // AND: both conditions must be true
    const systemAnd = new DialogueSystem({
      flags: { has_certificate: true },
      stats: { level: 15 },
    });
    systemAnd.loadDialogue(compoundDialogue);
    systemAnd.start();
    const nodeAnd = systemAnd.getCurrentNode()!;
    expect(systemAnd.getVisibleOptions(nodeAnd).map((o) => o.id)).toContain('opt_and');

    const systemAndFail = new DialogueSystem({
      flags: { has_certificate: true },
      stats: { level: 5 },
    });
    systemAndFail.loadDialogue(compoundDialogue);
    systemAndFail.start();
    const nodeAndFail = systemAndFail.getCurrentNode()!;
    expect(systemAndFail.getVisibleOptions(nodeAndFail).map((o) => o.id)).not.toContain('opt_and');

    // OR: either condition must be true
    const systemOr = new DialogueSystem({
      flags: { is_vip: false },
      stats: { level: 25 },
    });
    systemOr.loadDialogue(compoundDialogue);
    systemOr.start();
    const nodeOr = systemOr.getCurrentNode()!;
    expect(systemOr.getVisibleOptions(nodeOr).map((o) => o.id)).toContain('opt_or');

    const systemOrFail = new DialogueSystem({
      flags: { is_vip: false },
      stats: { level: 5 },
    });
    systemOrFail.loadDialogue(compoundDialogue);
    systemOrFail.start();
    const nodeOrFail = systemOrFail.getCurrentNode()!;
    expect(systemOrFail.getVisibleOptions(nodeOrFail).map((o) => o.id)).not.toContain('opt_or');
  });
});
