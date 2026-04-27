import { describe, it, expect } from 'vitest';
import { UI_TEXT_RESOLUTION, uiTextStyle } from '../src/ui/text-style';

describe('text-style', () => {
  it('should have resolution set to 4', () => {
    expect(UI_TEXT_RESOLUTION).toBe(4);
  });

  it('should apply resolution to all text styles', () => {
    const style = uiTextStyle({ fontSize: '10px', color: '#ffffff' });
    expect(style.resolution).toBe(4);
    expect(style.fontSize).toBe('10px');
    expect(style.color).toBe('#ffffff');
  });

  it('should allow overriding resolution', () => {
    const style = uiTextStyle({ fontSize: '10px', resolution: 8 });
    expect(style.resolution).toBe(8);
  });

  it('should merge custom style over defaults', () => {
    const style = uiTextStyle({ fontSize: '12px', color: '#ff0000' });
    expect(style.fontFamily).toBeDefined();
    expect(style.fontSize).toBe('12px');
    expect(style.color).toBe('#ff0000');
  });
});
