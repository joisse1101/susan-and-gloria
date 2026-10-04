// Work behaviour shared by coworkers and the player
export const WORK_DURATION_MS = 10000;
export const WORK_PHRASE_MS = 1200;
// A coworker says one of these (picked at random) when it reaches its desk and can't use it. Add or edit lines freely.
export const DESK_TAKEN_PHRASES = [
    'oops, maybe later...',
    'oh, someone\'s there...',
    'I\'ll come back...',
    'sorry, didn\'t see you there...',
    'ah, taken. another time...',
    'guess I\'ll wait...'
];
// The player or a coworker says one of these when a chair trip ends and they can't get back to work (blocked,
// too slow), as if they forgot what they were doing
export const FORGETFUL_PHRASES = [
    'what was I doing?',
    'hmm?',
    'wait, why did I come over here?',
    'huh, what was I after...',
    'now where was I going?'
];
// A coworker says one of these when the player takes the chair it was fetching; a make-do line follows in the same bubble
export const STOLEN_PHRASES_NICE = [
    'oh, all yours!',
    'no worries, go ahead!',
    'guess I\'m done with that then!',
    'be my guest!',
    'it\'s all yours, friend!',
    'by all means, take it!',
    'no biggie, you take it!',
    'oh, go right ahead!',
    'knock yourself out!',
    'yours now!',
    'feel free to take it!',
    'no problem at all!'
];
// Said when a dragged chair jams: they let go of it and work standing instead
export const JAM_PHRASES = [
    'oh, never mind...',
    'I\'ll make do...',
    'forget the chair...',
    'I\'ll stand, then...',
    'this will do...',
    'it\'s no big deal...',
    'don\'t worry about it...',
    'I\'ll manage somehow...',
    'any spot is fine...',
    'it\'s good enough...',
    'no need to bother...',
    'I\'ll figure it out...',
    'leave it as is...',
    'don\'t go out of your way...'
];
export const WORK_PHRASES = [
    // Thinking & Processing
    'hmm...',
    'let me think...',
    'let\'s see here...',
    'taking a step back...',
    'connecting the dots...',
    'crunching the numbers...',
    'testing an idea...',
    'pondering this one...',
    'if I look at it this way...',
    'tracing the logic...',

    // Course Correction & Pivoting
    'wait, no...',
    'back to the drawing board...',
    'hold on, that doesn\'t fit...',
    'let me try another angle...',
    'scratch that...',
    'not quite what I meant...',
    'wait, let\'s rethink this...',
    'rewinding a bit...',
    'changing gears...',

    // Breakthroughs & Fits
    'how about this...',
    'ooh, that works',
    'now we\'re onto something...',
    'there\'s the spark...',
    'that\'s more like it!',
    'bingo, found it...',
    'it\'s coming together...',
    'a subtle detail, but huge...',
    'spot on!',

    // Fine-Tuning & Polishing
    'almost there...',
    'one more tweak...',
    'just a slight adjustment...',
    'smoothing out the edges...',
    'tidying up the details...',
    'dotting the i\'s...',
    'getting the balance right...',
    'giving it a final polish...',
    'nesting the last piece...',

    // Focus & Recovery
    'where was I...',
    'picking up where I left off...',
    'getting back on track...',
    'where did that thread go...',
    're-centering...',
    'focusing in...'
];
