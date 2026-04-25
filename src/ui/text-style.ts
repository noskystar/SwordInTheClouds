export const UI_FONT_FAMILY = '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif';
export const UI_TEXT_RESOLUTION = 2;

type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;

export function uiTextStyle(style: TextStyle): TextStyle {
  return {
    fontFamily: UI_FONT_FAMILY,
    resolution: UI_TEXT_RESOLUTION,
    padding: { y: 1 },
    ...style,
  };
}
