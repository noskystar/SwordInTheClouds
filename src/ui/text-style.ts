export const UI_FONT_FAMILY = '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif';
export const UI_TEXT_RESOLUTION = 2;

type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;

export function uiTextStyle(style: TextStyle): TextStyle {
  return {
    fontFamily: UI_FONT_FAMILY,
    resolution: UI_TEXT_RESOLUTION,
    // @ts-ignore - sharpness exists in Phaser 3.80+; ignored safely in 3.70
    sharpness: { left: 0, top: 0, right: 0, bottom: 0 },
    padding: { y: 1 },
    ...style,
  };
}
