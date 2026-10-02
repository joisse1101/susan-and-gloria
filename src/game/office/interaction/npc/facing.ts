import type Phaser from 'phaser';

type Sprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

// Coworkers have a sheet row per direction, so their horizontal facing is stored and drives which row plays.
export const FACING = 'facing';

export function faceHorizontal(npc: Sprite, left: boolean) {
    npc.setData(FACING, left ? 'left' : 'right');
}
