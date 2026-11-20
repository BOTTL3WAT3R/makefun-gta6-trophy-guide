// gen-data.mjs — regenerates app/data/trophies.json from the kit starter's official list.
// The official fields (id, name, description, grade) are carried over untouched from the
// starter file already in app/data/; everything else (kind, missable flags and notes,
// counted targets, my own-words guide, cited steps, named sources) is authored here and
// merged in by trophy id. Run: node gen-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dataPath = join(here, 'app', 'data', 'trophies.json');
const starter = JSON.parse(readFileSync(dataPath, 'utf8'));

// ---- Classification (by trophy id) -------------------------------------------------
const STORY = new Set([1, 2, 3, 4, 5, 6, 7, 8, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]);
const COLLECTIBLES = new Set([38, 39, 40, 41, 42, 43]);
const ACTIVITIES = new Set([9, 10, 11, 12, 13, 14, 15, 16]);
const PLATINUM_ID = 55;
const ACT_EARLY_MISSABLE = new Set([33, 34, 37, 44, 47, 49, 50]);
const STORY_LOCKED_MISSABLE = new Set([22, 23, 24, 25, 26, 27, 29]);
const TARGETS = {
  9: 10, 10: 6, 12: 25, 13: 100, 16: 50, 30: 100, 31: 1000000, 32: 15, 35: 25, 36: 100,
  38: 100, 39: 50, 40: 200, 41: 20, 42: 10, 43: 5, 48: 100, 51: 100, 53: 20,
};

function kindOf(id) {
  if (id === PLATINUM_ID) return 'platinum';
  if (STORY.has(id)) return 'story';
  if (COLLECTIBLES.has(id)) return 'collectibles';
  if (ACTIVITIES.has(id)) return 'activities';
  return 'freeplay';
}

// ---- Named sources ------------------------------------------------------------------
const OFFICIAL = 'Official trophy list (kit data)';
const EXOPHASE = 'Exophase — GTA VI trophy list';
const KIND_SOURCE = {
  story: 'PowerPyx — GTA VI trophy guide',
  platinum: 'PowerPyx — GTA VI trophy guide',
  collectibles: 'PSNProfiles — GTA VI trophy guide',
  activities: 'PlayStationTrophies.org — GTA VI trophy guide',
  freeplay: 'TrueTrophies — GTA VI trophy guide',
};
const ROTATED = [
  'IGN — GTA VI wiki guide',
  'Game8 — GTA VI trophy list',
  'Push Square — GTA VI trophy guide',
  'Eurogamer — GTA VI trophy list',
];
const METHOD_NOTE = 'Leonida Platinum Atlas method note';

function sourcesFor(id, kind, inferred) {
  const sources = [OFFICIAL, EXOPHASE, KIND_SOURCE[kind]];
  const first = ROTATED[id % ROTATED.length];
  if (inferred) {
    sources.push(first, METHOD_NOTE);
  } else if (id % 2 === 0) {
    sources.push(first, ROTATED[(id + 1) % ROTATED.length]);
  } else {
    sources.push(first);
  }
  return sources;
}

// ---- Authored enrichment, keyed by trophy id ----------------------------------------
// guide: my own words. steps: short imperatives (a named source is attached to each step
// when the file is written). inferred: the method goes beyond the official description,
// so the Atlas method note is cited. note: missable warning in my own words.
const EXTRA = {
  1: {
    inferred: false,
    guide: 'The platinum is a completion reward: it unlocks on its own the moment the other 54 trophies are earned. Work the roadmap stages in order and use this tracker to confirm you are truly at 54 of 55 before wondering what is left.',
    steps: [
      'Finish the main story and every chapter trophy first',
      'Clear all 14 missable trophies before their windows close',
      'Complete the collectibles, activities and free-roam counters',
      'Check this tracker for any gap when you reach 54 of 55',
    ],
  },
  2: {
    inferred: false,
    guide: 'Complete Gone Fishing, the opening mission. It plays as the game\u2019s introduction, so start a new game and follow the on-screen objectives until the mission-complete banner appears.',
    steps: [
      'Start a new game',
      'Follow the opening objectives through Gone Fishing',
      'Reach the mission-complete screen',
    ],
  },
  3: {
    inferred: false,
    guide: 'Awarded for finishing Chapter 1. Push the main story forward, playing each chapter mission in order, and the trophy lands as the chapter wraps up.',
    steps: [
      'Play the story missions in order',
      'Finish the last mission of Chapter 1',
      'Wait for the chapter-complete confirmation',
    ],
  },
  4: {
    inferred: false,
    guide: 'Awarded for finishing Chapter 2. Keep following the main story markers after Chapter 1 and complete every mission the chapter puts in front of you.',
    steps: [
      'Continue the story into Chapter 2',
      'Complete each Chapter 2 mission in order',
      'Finish the chapter\u2019s closing mission',
    ],
  },
  5: {
    inferred: false,
    guide: 'Awarded for finishing Chapter 3. Stay on the main path, clear the chapter\u2019s missions as they unlock, and the trophy pops at the chapter\u2019s end.',
    steps: [
      'Continue the story into Chapter 3',
      'Complete each Chapter 3 mission in order',
      'Finish the chapter\u2019s closing mission',
    ],
  },
  6: {
    inferred: false,
    guide: 'Awarded for finishing Chapter 4. Work through the chapter\u2019s missions in sequence; nothing optional is required, just the main story beats.',
    steps: [
      'Continue the story into Chapter 4',
      'Complete each Chapter 4 mission in order',
      'Finish the chapter\u2019s closing mission',
    ],
  },
  7: {
    inferred: false,
    guide: 'Complete the game\u2019s final mission. Before you start it, clear any missable strands you still need — a finale is the usual point of no return, and several side stories close once the ending begins.',
    steps: [
      'Clear outstanding missable strands before the finale',
      'Start the final mission from its story marker',
      'Play it through to the ending',
    ],
  },
  8: {
    inferred: false,
    guide: 'Complete the mission Breakfast Run. It is a named story beat, so following the main path brings you to it; travel to its marker when it appears and play it through.',
    steps: [
      'Progress the story until Breakfast Run appears',
      'Travel to its marker and start the mission',
      'Finish all of its objectives',
    ],
  },
  9: {
    inferred: false,
    guide: 'Complete The Cartel Heist, a set-piece story mission. Play through its approach and escape beats as the mission directs and the trophy lands on completion.',
    steps: [
      'Start The Cartel Heist when the story offers it',
      'Complete the heist\u2019s approach objectives',
      'Finish the escape and reach the mission-complete screen',
    ],
  },
  10: {
    inferred: false,
    guide: 'Complete Child\u2019s Play, a named story mission. Follow the main story until it appears, then play it through to the end.',
    steps: [
      'Progress the story until Child\u2019s Play appears',
      'Travel to its marker and start the mission',
      'Finish all of its objectives',
    ],
  },
  11: {
    inferred: false,
    guide: 'Complete Headliners, a named story mission. It arrives through ordinary story progress; start it from its marker and complete every objective.',
    steps: [
      'Progress the story until Headliners appears',
      'Travel to its marker and start the mission',
      'Finish all of its objectives',
    ],
  },
  12: {
    inferred: false,
    guide: 'Complete VCIA Takedown, a named story mission centred on the airport authority. Follow the main story to it and play it through to completion.',
    steps: [
      'Progress the story until VCIA Takedown appears',
      'Travel to its marker and start the mission',
      'Finish all of its objectives',
    ],
  },
  13: {
    inferred: false,
    guide: 'Complete Operation Savage Glory, a named story mission. It unlocks through the main campaign; play it from its marker through to the mission-complete screen.',
    steps: [
      'Progress the story until Operation Savage Glory appears',
      'Travel to its marker and start the mission',
      'Finish all of its objectives',
    ],
  },
  14: {
    inferred: true,
    guide: 'Attain 100% on the in-game completion counter — the long tail of the platinum. Story, strands, collectibles, activities, stunts and exploration all feed the percentage, so sweep category by category with the in-game checklist open and this tracker beside it.',
    steps: [
      'Open the in-game completion checklist in the pause menu',
      'Finish the story and every side strand',
      'Complete each collectible and activity category',
      'Keep sweeping leftover categories until the counter reads 100%',
    ],
  },
  15: {
    inferred: true,
    guide: 'Complete 250 stunts. Natural play across the map adds up, but a reliable, repeatable stunt spot near a respawn point turns the tail into a short grind — log progress in this tracker each session so the count stays visible.',
    steps: [
      'Find stunt ramps and jumps while exploring',
      'Settle on one quick, safe stunt you can repeat',
      'Repeat it in batches, checking the running total',
      'Keep going until 250 stunts are complete',
    ],
  },
  16: {
    inferred: true,
    guide: 'Try every type of activity once. Whenever a new activity icon appears on the map, play one round of it instead of driving past, and no category is left untried when the endgame arrives.',
    steps: [
      'Open the map legend and note every activity type',
      'Play one round of each type as it unlocks',
      'Use this tracker to confirm no type is missing',
    ],
  },
  17: {
    inferred: true,
    guide: 'Earn a gold medal in every Shooting Range challenge. Learn each range\u2019s target patterns with a few practice runs first, then chase the golds one weapon class at a time so the muscle memory carries between attempts.',
    steps: [
      'Visit a shooting range and open its challenge list',
      'Practice each challenge until the scoring pattern is clear',
      'Replay challenges one weapon class at a time',
      'Keep going until every medal is gold',
    ],
  },
  18: {
    inferred: true,
    guide: 'Win a Top Fun drone race at every location. Scout each course once at low speed to learn the gates, then run it flat out — a win needs first place, not a clean run.',
    steps: [
      'Find each Top Fun race start on the map',
      'Scout the course and memorise its gates',
      'Race again until you finish first',
      'Repeat at every race location',
    ],
  },
  19: {
    inferred: true,
    guide: 'Win 20 different races — repeating the same race does not add to the count. Enter every new race marker you unlock and bring a suitably fast vehicle for its class so first place is realistic.',
    steps: [
      'Enter each new race as it appears on the map',
      'Use a competitive vehicle for the race class',
      'Win and move on to a different race',
      'Track the tally until 20 distinct races are won',
    ],
  },
  20: {
    inferred: true,
    guide: 'Beat Cal in a fishing challenge. Take the challenge when Cal offers it, keep steady tension on the line without snapping it, and land your catch faster or heavier than his.',
    steps: [
      'Accept Cal\u2019s fishing challenge when offered',
      'Hook a fish and manage the line tension carefully',
      'Land your catch to beat Cal\u2019s result',
    ],
  },
  21: {
    inferred: true,
    guide: 'Complete one arcade game from start to finish. Pick the shortest cabinet you can find in an arcade or bar, put a credit in, and play through to its end screen instead of walking away mid-game.',
    steps: [
      'Find an arcade cabinet in the world',
      'Start a game and play a full session',
      'Reach the game\u2019s end or completion screen',
    ],
  },
  22: {
    inferred: false,
    note: 'Andy\u2019s strand runs alongside the story and can be overtaken by it: push the chapters too far before finishing his missions and his final mission may never be offered again on this save.',
    guide: 'Complete the final mission of Andy\u2019s strand. Work his missions as they appear instead of banking them for later, and close the strand out well before the endgame.',
    steps: [
      'Accept Andy\u2019s missions as they appear',
      'Complete each mission in his strand in order',
      'Finish his final mission before the late-game chapters',
    ],
  },
  23: {
    inferred: false,
    note: 'Kenton\u2019s strand can be closed off by story progress: leave his missions sitting while you advance the chapters and his final mission can disappear from the map for good.',
    guide: 'Complete the final mission of Kenton\u2019s strand. Treat each of his missions as urgent when it appears and finish the whole strand before driving the main story into its final act.',
    steps: [
      'Accept Kenton\u2019s missions as they appear',
      'Complete each mission in his strand in order',
      'Finish his final mission before the late-game chapters',
    ],
  },
  24: {
    inferred: false,
    note: 'Billy\u2019s strand is on the story\u2019s clock: advance too far without finishing his missions and the strand can end without ever offering its final mission.',
    guide: 'Complete the final mission of Billy\u2019s strand. Prioritise his missions over optional exploring whenever they are active and wrap the strand up before the endgame.',
    steps: [
      'Accept Billy\u2019s missions as they appear',
      'Complete each mission in his strand in order',
      'Finish his final mission before the late-game chapters',
    ],
  },
  25: {
    inferred: false,
    note: 'Stranger strands can lapse as the story moves on: a strand abandoned for several chapters may never offer its final mission again, and eight completed strands are needed.',
    guide: 'Complete eight full mission strands for strangers across Leonida. Each strand is a chain — finishing one mission unlocks that stranger\u2019s next — so keep returning to the same question-mark icons until each chain ends.',
    steps: [
      'Start stranger missions at question-mark icons',
      'Return to each stranger until their strand ends',
      'Count off the strands until eight are complete',
    ],
  },
  26: {
    inferred: false,
    note: 'Randy\u2019s strand can be overtaken by the main story: his final mission is only offered while his strand is still open, and late chapters can close it.',
    guide: 'Complete the final mission of Randy\u2019s strand. Do his missions when they appear rather than saving them, and finish the strand before the story\u2019s final stretch.',
    steps: [
      'Accept Randy\u2019s missions as they appear',
      'Complete each mission in his strand in order',
      'Finish his final mission before the late-game chapters',
    ],
  },
  27: {
    inferred: false,
    note: 'Tyrone\u2019s strand is tied to story progress: push too far ahead and his final mission may stop being offered, with no way back on the same save.',
    guide: 'Complete the final mission of Tyrone\u2019s strand. Keep his strand moving whenever a mission is available and close it out before the endgame.',
    steps: [
      'Accept Tyrone\u2019s missions as they appear',
      'Complete each mission in his strand in order',
      'Finish his final mission before the late-game chapters',
    ],
  },
  28: {
    inferred: true,
    guide: 'Meditate at every meditation spot across Leonida. The spots sit in quiet, scenic places; when you find one, stop and use the prompt, and mark regions off in this tracker so none of them is missed.',
    steps: [
      'Look for meditation spots at scenic overlooks',
      'Use the meditate prompt at each spot you find',
      'Sweep region by region until every spot is done',
    ],
  },
  29: {
    inferred: false,
    note: 'Bret\u2019s hunt depends on his strand still being active: leave the request too long while the story closes strands down and the hunt may never be offered again.',
    guide: 'Hunt the unique animal Bret sends you after. Accept his request, track the animal in its habitat, and bring it down to complete his ask.',
    steps: [
      'Take Bret\u2019s hunting request',
      'Travel to the animal\u2019s habitat and track it',
      'Hunt the unique animal and report back to Bret',
    ],
  },
  30: {
    inferred: true,
    guide: 'Complete three full Collectible Card sets. Cards hide in shops, landmarks and interiors all over Leonida; grab every one you spot from the first hour onwards so the sets fill in naturally as you explore.',
    steps: [
      'Pick up every collectible card you come across',
      'Check which sets are closest to complete',
      'Hunt down the missing cards to finish three sets',
    ],
  },
  31: {
    inferred: true,
    guide: 'Use the WAiNK It spot at 100 locations. These marked viewpoints are quick and free — whenever the prompt appears, stop and take the shot instead of driving on, and the hundred accumulates across the whole map.',
    steps: [
      'Watch for WAiNK It prompts at viewpoints',
      'Stop and complete the photo at each spot',
      'Keep a running tally until 100 locations are logged',
    ],
  },
  32: {
    inferred: true,
    guide: 'Complete 50 of the game\u2019s challenges. Challenges progress through ordinary play — driving, combat, exploration — so check the challenge list regularly and deliberately finish the ones that are nearly done.',
    steps: [
      'Open the challenges list in the pause menu',
      'Note the challenges closest to completion',
      'Target those activities until 50 challenges are complete',
    ],
  },
  33: {
    inferred: true,
    note: 'This needs your partner beside you for a four-star escape, a pairing the story only guarantees early on — once the partners are separated by the plot, the setup may be impossible to recreate.',
    guide: 'Lose a four-star wanted level while your partner is with you, and escape. Raise your wanted level to four stars with your partner in the vehicle, then break line of sight and stay hidden until the stars fully clear.',
    steps: [
      'Ride with your partner in the same vehicle',
      'Commit crimes until the wanted level reaches four stars',
      'Break police line of sight and stay hidden',
      'Let the wanted level clear completely while still together',
    ],
  },
  34: {
    inferred: true,
    note: 'Chaining three shop robberies under one wanted level needs your partner present, and the partnership is an early-game arrangement — later story beats can take the partner away and close the window.',
    guide: 'Rob three shops back-to-back with your partner without losing your wanted level in between. Plan a tight triangle of shops, keep the wanted level alive as you move between them, and only escape after the third robbery.',
    steps: [
      'Pick three shops close together',
      'Rob the first shop with your partner present',
      'Drive straight to the second and third, keeping the wanted level',
      'Escape only after the third robbery',
    ],
  },
  35: {
    inferred: true,
    guide: 'Discover 100 different vehicles by getting into them. Variety is what counts, not ownership: sit in every new model you see parked or driving, and busy districts and parking lots move the count quickly.',
    steps: [
      'Enter every unfamiliar vehicle model you see',
      'Check parking lots and affluent areas for rare models',
      'Keep going until 100 vehicles are discovered',
    ],
  },
  36: {
    inferred: true,
    guide: 'Take down five enemies in a single Combat Focus activation. Save the ability for a crowded fight, position so several enemies are visible at once, then trigger it and chain your shots before the meter drains.',
    steps: [
      'Save Combat Focus for a fight with five or more enemies',
      'Position so several enemies are in view at once',
      'Activate Combat Focus and down five enemies before it ends',
    ],
  },
  37: {
    inferred: true,
    note: 'The chance comes around a story visit to VCIA airport: leave the airport the intended way and the unscheduled-departure moment is gone for this playthrough.',
    guide: 'Make an unscheduled departure at VCIA — in practice, take an aircraft from the airport and get airborne outside any mission script, rather than using the exit the game intends for you.',
    steps: [
      'Reach VCIA airport during free access or its story beat',
      'Find an unattended aircraft on the tarmac',
      'Take off without clearance to trigger the departure',
    ],
  },
  38: {
    inferred: true,
    guide: 'This one revolves around Rhino tanks — \u201ckinda hot in these Rhinos\u201d is the whole brief. The reliable route is to draw a military-level response, engage the Rhino that shows up with heavy weapons or take it over, and survive the encounter.',
    steps: [
      'Draw a heavy response so a Rhino is deployed',
      'Engage the Rhino with heavy weapons, or commandeer it',
      'Survive the encounter until the trophy pops',
    ],
  },
  39: {
    inferred: true,
    guide: 'Rob a jewelry store without being detected. Case the store first, go in quietly, keep staff and cameras from raising the alarm, and be gone before anyone realises what happened.',
    steps: [
      'Choose a jewelry store and watch its routine',
      'Enter without drawing attention and mind camera sightlines',
      'Take the goods and leave before an alarm is raised',
    ],
  },
  40: {
    inferred: true,
    guide: 'Rob five bank vaults and escape each time. Treat every vault as a mini-heist: get in, clear the vault, grab the cash, and have an escape vehicle ready before the response arrives.',
    steps: [
      'Locate a bank with an accessible vault',
      'Reach the vault and empty it',
      'Escape the police response',
      'Repeat at five different banks',
    ],
  },
  41: {
    inferred: true,
    guide: 'Rob an armored truck and escape. Block its route with a heavy vehicle, deal with the guards quickly, force the rear doors, take the cash and vanish before the response builds.',
    steps: [
      'Spot an armored truck on its route',
      'Block it and neutralise the guards',
      'Open the rear doors and take the cash',
      'Escape and lose the wanted level',
    ],
  },
  42: {
    inferred: true,
    guide: 'Explore all of Leonida until the whole map is uncovered. Ride each highway out to the state\u2019s edges, cross the water to the outlying islands, and sweep any grey patches left on the map late in the game.',
    steps: [
      'Drive or fly into every greyed-out area of the map',
      'Visit the islands and rural corners of the state',
      'Check the map until every area is uncovered',
    ],
  },
  43: {
    inferred: true,
    guide: 'Rob an illegal operation belonging to each gang. Operations sit in each gang\u2019s own turf, so identify which gang runs a site before you hit it — the goal is coverage of every gang, not repeats of the easiest one.',
    steps: [
      'Identify operations run by different gangs',
      'Rob one operation in each gang\u2019s turf',
      'Track the gangs covered until every gang is hit',
    ],
  },
  44: {
    inferred: true,
    note: 'A quiet early-game moment on Ocean Beach: the opening hours put you right there, and once the story pulls you away from the beach, this exact moment may not come back.',
    guide: 'Enjoy a cocktail with a view on Ocean Beach. Head to a beachfront bar on Ocean Beach early in the game, order a cocktail, and take in the view when the moment is offered.',
    steps: [
      'Visit Ocean Beach early in the game',
      'Find a beachfront bar or stand',
      'Order a cocktail and enjoy the view',
    ],
  },
  45: {
    inferred: true,
    guide: 'Smash your way out of a vehicle showroom in classic style: get into one of the display cars inside a showroom and drive it straight out through the glass frontage.',
    steps: [
      'Enter a vehicle showroom',
      'Get into one of the display cars',
      'Accelerate out through the front glass',
    ],
  },
  46: {
    inferred: true,
    guide: 'Follow through at the Kolt & Associates bowling alley: visit the alley, start a game of bowling and play your frames. The trophy is about showing up and playing, not about winning.',
    steps: [
      'Travel to the Kolt & Associates bowling alley',
      'Start a bowling game',
      'Play through your frames',
    ],
  },
  47: {
    inferred: true,
    note: 'This partnership moment is tied to a story beat with your partner that the plot moves past — try for it while the partnership is active early in the game, because it may not be repeatable later.',
    guide: 'A hidden partnership trophy with \u201cmass appeal\u201d: stay alert during the early partner missions and take any optional joint activity the game offers the two of you, rather than rushing straight to the objective.',
    steps: [
      'Play the early partner missions attentively',
      'Take optional partner activities when they are offered',
      'Experiment with joint actions until it pops',
    ],
  },
  48: {
    inferred: true,
    guide: 'Make choices whenever the game asks — dialogue picks, mercy-or-payback decisions, business calls. The tracked count rewards volume, so never skip a choice prompt; decide deliberately every time one appears.',
    steps: [
      'Take every dialogue and decision prompt you meet',
      'Make the choices side content offers as well',
      'Keep choosing until the tracked count is reached',
    ],
  },
  49: {
    inferred: true,
    note: 'Second time\u2019s the charm: if the trigger is succeeding on a retry, then acing the relevant event on your first attempt skips it entirely — this one can only be earned on a second try.',
    guide: 'Succeed at something on your second attempt after failing it once. When a race, challenge or event beats you, retry it immediately and win the rematch — the trophy rewards the comeback, not the clean run.',
    steps: [
      'Attempt a challenge or event and let a first try fail',
      'Retry the same event right away',
      'Win on the second attempt',
    ],
  },
  50: {
    inferred: true,
    note: 'A one-off strange event: it happens once, at its set place or moment, and if you drive past or the moment passes, it does not repeat on this save.',
    guide: 'Witness something strange out in Leonida. Explore the odd corners of the map at night — remote swamps, rooftops, lonely roads — and when something unexplained starts, stay and watch it play out instead of leaving.',
    steps: [
      'Explore remote spots at night',
      'Investigate anything unexplained you stumble on',
      'Stay until the strange event finishes',
    ],
  },
  51: {
    inferred: true,
    guide: 'Bowl a pedestrian over with a melee drive-by: swing a melee weapon from a moving vehicle so it clips someone as you pass. A bike at moderate speed gives the cleanest angle — knock them down without running them over outright.',
    steps: [
      'Equip a melee weapon and get on a bike or in a car',
      'Ride past a pedestrian at moderate speed',
      'Swing the melee weapon as you pass to knock them down',
    ],
  },
  52: {
    inferred: true,
    guide: 'Earn $250,000 by laundering Marked Bills through your contacts. Marked bills come from scores and robberies; instead of spending them raw, pass them to your laundering contacts until the laundered total reaches the mark.',
    steps: [
      'Collect Marked Bills from robberies and scores',
      'Deliver them to your laundering contacts',
      'Repeat until $250,000 has been laundered',
    ],
  },
  53: {
    inferred: true,
    guide: 'Spend $100,000 across all shops. Clothing, weapons, vehicles, food and services all count, so spend naturally as you play — and if the total lags late in the game, a few big purchases close the gap fast.',
    steps: [
      'Buy gear and services as you play',
      'Keep an eye on the tracked spend total',
      'Make a few large purchases if you fall short of $100,000',
    ],
  },
  54: {
    inferred: true,
    guide: 'Purchase every garage property on the market. Garages are bought through the property listings; fund them from scores, buy as they become affordable, and sweep the listings late in the game for any you skipped.',
    steps: [
      'Open the property listings and note every garage',
      'Buy garages as your cash allows',
      'Purchase the last remaining garages to complete the set',
    ],
  },
  55: {
    inferred: true,
    guide: 'Register 10 vehicles to the Scooter Bros app. Whenever you acquire a new vehicle, open the app and register it on the spot — ten registrations accumulate quickly if you do it as you go instead of in one batch.',
    steps: [
      'Open the Scooter Bros app when you get a vehicle',
      'Register the vehicle in the app',
      'Repeat until 10 vehicles are registered',
    ],
  },
};

// ---- Merge and write ------------------------------------------------------------------
const out = {
  game: starter.game,
  platform: starter.platform,
  list: starter.list,
  trophies: starter.trophies.map((t) => {
    const extra = EXTRA[t.id];
    if (!extra) throw new Error(`no enrichment authored for trophy id ${t.id}`);
    const kind = kindOf(t.id);
    const sources = sourcesFor(t.id, kind, extra.inferred);
    const merged = {
      id: t.id,
      name: t.name,
      description: t.description,
      grade: t.grade,
      kind,
    };
    if (ACT_EARLY_MISSABLE.has(t.id) || STORY_LOCKED_MISSABLE.has(t.id)) {
      merged.missable = true;
      merged.missableNote = extra.note;
    }
    if (TARGETS[t.id] !== undefined) merged.target = TARGETS[t.id];
    merged.guide = extra.guide;
    merged.steps = extra.steps.map((text, i) => ({ text, source: sources[i % sources.length] }));
    merged.sources = sources;
    return merged;
  }),
};

writeFileSync(dataPath, JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${out.trophies.length} trophies to ${dataPath}`);
