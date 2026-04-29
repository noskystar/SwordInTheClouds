import { describe, it, expect } from 'vitest';
import { UI_FONT_FAMILY, uiTextStyle } from '../src/ui/text-style';

describe('text-style', () => {
  it('should have font family defined', () => {
    expect(UI_FONT_FAMILY).toBeDefined();
  });

  it('should merge custom style over defaults', () => {
    const style = uiTextStyle({ fontSize: '12px', color: '#ff0000' });
    expect(style.fontFamily).toBeDefined();
    expect(style.fontSize).toBe('12px');
    expect(style.color).toBe('#ff0000');
  });

  it('should use resolution 4 for fontSize >= 16px', () => {
    expect(uiTextStyle({ fontSize: '18px' }).resolution).toBe(4);
    expect(uiTextStyle({ fontSize: '16px' }).resolution).toBe(4);
    expect(uiTextStyle({ fontSize: 20 }).resolution).toBe(4);
  });

  it('should use resolution 2 for fontSize 12-15px', () => {
    expect(uiTextStyle({ fontSize: '14px' }).resolution).toBe(2);
    expect(uiTextStyle({ fontSize: '12px' }).resolution).toBe(2);
    expect(uiTextStyle({ fontSize: '15px' }).resolution).toBe(2);
    expect(uiTextStyle({ fontSize: 14 }).resolution).toBe(2);
  });

  it('should use resolution 1 for fontSize < 12px', () => {
    expect(uiTextStyle({ fontSize: '10px' }).resolution).toBe(1);
    expect(uiTextStyle({ fontSize: '7px' }).resolution).toBe(1);
    expect(uiTextStyle({ fontSize: 10 }).resolution).toBe(1);
  });

  it('should allow explicit resolution override', () => {
    const style = uiTextStyle({ fontSize: '10px', resolution: 8 });
    expect(style.resolution).toBe(8);
  });

  it('should respect explicit resolution: 1 even when fontSize >= 16px would default to 4', () => {
    const style = uiTextStyle({ fontSize: '18px', resolution: 1 });
    expect(style.resolution).toBe(1);
  });

  it('should respect explicit resolution: 0 even when fontSize < 12px would default to 1', () => {
    const style = uiTextStyle({ fontSize: '10px', resolution: 0 });
    expect(style.resolution).toBe(0);
  });

  it('should use resolution 1 when fontSize is missing', () => {
    expect(uiTextStyle({ color: '#fff' }).resolution).toBe(1);
  });

  it('should use resolution 1 for invalid fontSize strings', () => {
    expect(uiTextStyle({ fontSize: '12em' }).resolution).toBe(1);
    expect(uiTextStyle({ fontSize: 'abc' }).resolution).toBe(1);
  });
});
