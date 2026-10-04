import type Phaser from 'phaser';

type Sprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

// What watering needs to know about whoever waters, so it never asks "is this the player?". The id is the owner of
// the claim on the plant.
export interface WaterActor {
    sprite: Sprite;
    // A coworker with a bubble up, or the player pressing a key, typing or with a bubble up: stops it (office-interaction-trigger)
    interrupted(): boolean;
    standingStill(): boolean;
    // The player must stand still to be taken over; a coworker can walk in
    stillRequired: boolean;
}

// Pure: what interrupts each kind of actor
export const coworkerInterrupted = (bubbleUp: boolean) => bubbleUp;
export const playerInterrupted = (moving: boolean, typing: boolean, bubbleUp: boolean) => moving || typing || bubbleUp;
