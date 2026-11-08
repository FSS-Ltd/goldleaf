// Copied from the approved phonics progression (client PDF, page 2).
export type Stage = {
  id: 0 | 1 | 2 | 3 | 4;
  name: string;
  sounds: string;
  tricky: string;
  goal: string;
  examples: string;
};

export const stages: Stage[] = [
  {
    id: 0,
    name: "Stage 0: Listening",
    sounds:
      "No letters yet. Environmental sounds, rhythm, rhyme, alliteration, voice sounds and oral blending (c-a-t... cat).",
    tricky: "None",
    goal: "Hears and plays with sounds in words.",
    examples: "c-a-t... cat",
  },
  {
    id: 1,
    name: "Stage 1",
    sounds: "s a t p · i n m d · g o c k · ck · e u r · h b f ff l ll ss",
    tricky: "the, to, I, no, go, into",
    goal: "Blends and reads simple CVC words.",
    examples: "sat, pin, dog",
  },
  {
    id: 2,
    name: "Stage 2",
    sounds:
      "j v w x · y z zz qu · ch sh th ng · ai ee igh oa · oo (book) oo (moon) ar or · ur ow oi ear · air ure er",
    tricky: "he, she, we, me, be, was, you, they, all, are, my, her",
    goal: "Reads words and short sentences with digraphs and trigraphs.",
    examples: "chip, rain, night",
  },
  {
    id: 3,
    name: "Stage 3",
    sounds: "No new sounds. Adjacent consonants: CVCC and CCVC words, then longer words.",
    tricky: "said, have, like, so, do, some, come, were, there, little, one, when, out, what",
    goal: "Reads longer words fluently.",
    examples: "stamp, frog, sandwich",
  },
  {
    id: 4,
    name: "Stage 4",
    sounds:
      "ay ou ie ea oy ir ue aw wh ph ew oe au ey · split digraphs a-e e-e i-e o-e u-e · alternative pronunciations",
    tricky: "oh, their, people, Mr, Mrs, looked, called, asked, could",
    goal: "Reads with alternative spellings.",
    examples: "play, cake, phone",
  },
];

export const ageMap = [
  { age: "Age 2", focus: "Stage 0, plus a playful introduction to the Stage 1 letters in s, a, t, p order. Sounds, not letter names. No reading expected." },
  { age: "Age 3", focus: "Stage 1, plus oral blending, then reading CVC words." },
  { age: "Age 4", focus: "Stages 2 and 3, roughly what Reception covers in school." },
  { age: "Confident 4 to 5", focus: "Stage 4 for children who are ready to go further." },
];
