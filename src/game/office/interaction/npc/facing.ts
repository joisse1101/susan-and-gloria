import type Phaser from 'phaser';

type Sprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

// Gloria is a single side-on frame that flips; Susan has a sheet row per direction, so her horizontal
// facing is stored instead and drives which row plays.
export const FACING = 'facing';

export function faceHorizontal(npc: Sprite, left: boolean) {
    npc.setData(FACING, left ? 'left' : 'right');
    npc.setFlipX(left && npc.getData('flips') !== false);
}
