export const UI_FONT_FAMILY = '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif';
export const UI_TEXT_RESOLUTION = 4;

type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;

function parseFontSize(fontSize: TextStyle['fontSize']): number {
  if (typeof fontSize === 'number') {
    return fontSize;
  }
  if (typeof fontSize === 'string') {
    const pxMatch = fontSize.match(/^(\d+(?:\.\d+)?)px$/);
    if (pxMatch) {
      return parseFloat(pxMatch[1]);
    }
  }
  return 0;
}

function resolveResolution(fontSize: TextStyle['fontSize']): number {
  const size = parseFontSize(fontSize);
  if (size >= 16) return 4;
  if (size >= 12) return 2;
  return 1;
}

export function uiTextStyle(style: TextStyle): TextStyle {
  const baseResolution = resolveResolution(style.fontSize);
  return {
    fontFamily: UI_FONT_FAMILY,
    resolution: baseResolution,
    padding: { y: 1 },
    ...style,
    resolution: 'resolution' in style ? style.resolution : baseResolution,
  };
}
