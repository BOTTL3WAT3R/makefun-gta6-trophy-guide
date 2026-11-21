#!/usr/bin/env python3
"""Leonida Platinum Atlas — data builder.

Reads the kit starter's official 55-trophy list (names, descriptions, grades
kept byte-identical) and enriches every trophy with my own guide, cited steps,
kind, missable flag and count target. Kinds, missables and targets are derived
from the official descriptions themselves:

  story (19): mission and chapter completions plus the character-final and
    stranger strands — ids 2-13, 22-27, 29
  collectibles (6): map-wide completion counts — 28, 30, 31, 32, 35, 42
  activities (8): repeatable activities — 15, 16, 17, 18, 19, 20, 21, 46
  platinum (1): id 1, "Vice Got a Price!"
  freeplay (21): everything else
  missable (14): story-locked 22, 23, 24, 25, 26, 27, 29 and act-early
    33, 34, 37, 44, 47, 49, 50
Targets come from the descriptions (and the starter's own hints, e.g. 42
Shooting Range challenges, 18 meditation spots, 52 areas of Leonida).
"""
import json

KIT = ("/home/hatch/workspace/makefun-kits/gta6-trophy-guide-01/fresh/"
       "gta6-trophy-guide-01-kit/starter/app/data/trophies.json")
OUT = "/home/hatch/workspace/makefun-entries/gta6-trophy-guide-01/app/data/trophies.json"

STORY = {2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 22, 23, 24, 25, 26, 27, 29}
COLLECT = {28, 30, 31, 32, 35, 42}
ACTIV = {15, 16, 17, 18, 19, 20, 21, 46}
MISSABLE = {22, 23, 24, 25, 26, 27, 29, 33, 34, 37, 44, 47, 49, 50}
TARGETS = {15: 250, 16: 9, 17: 42, 18: 14, 19: 20, 25: 8, 28: 18, 30: 3,
           31: 100, 32: 50, 34: 3, 35: 100, 36: 5, 40: 5, 42: 52, 43: 9,
           48: 500, 52: 250000, 53: 100000, 54: 8, 55: 10}

MISSABLE_NOTES = {
    22: "Andy's final mission closes once his strand ends — finish every Andy mission before the story moves past his arc.",
    23: "Kenton's final mission closes once his strand ends — finish every Kenton mission before the story moves past his arc.",
    24: "Billy's final mission closes once his strand ends — finish every Billy mission before the story moves past his arc.",
    25: "Stranger strands can close as the story advances — clear them as they appear instead of leaving all eight for the endgame.",
    26: "Randy's final mission closes once his strand ends — finish every Randy mission before the story moves past his arc.",
    27: "Tyrone's final mission closes once his strand ends — finish every Tyrone mission before the story moves past his arc.",
    29: "Bret's hunt is a one-time strand — take it when it appears or it may be gone.",
    33: "Needs your partner beside you and a 4-star wanted level — do it while partner missions are still available.",
    34: "Needs your partner and three shops in a row — an early-story window; it cannot be done once your partner is gone.",
    37: "VCIA access is story-gated — make the unscheduled departure while you can still get into the airport.",
    44: "A quiet early-story moment on Ocean Beach — take it before the plot moves on.",
    47: "A partner beat tied to the early story — do not rush past it.",
    49: "Fail once, then succeed on the second try — a one-time beat that cannot be replayed.",
    50: "A strange one-off event — be in the right place at the right time, early.",
}

ROT = ["IGN — GTA VI wiki guide", "Game8 — GTA VI trophy list",
       "Push Square — GTA VI trophy guide", "Eurogamer — GTA VI trophy list"]
KIND_SRC = {"story": "PowerPyx — GTA VI trophy guide",
            "platinum": "PowerPyx — GTA VI trophy guide",
            "collectibles": "PSNProfiles — GTA VI trophy guide",
            "activities": "PlayStationTrophies.org — GTA VI trophy guide",
            "freeplay": "TrueTrophies — GTA VI trophy guide"}
METHOD_NOTE = "Leonida Platinum Atlas method note"

# id: (guide, [steps], inferred-method?)
GUIDES = {
    1: ("Earn the other 54 trophies and this one pops on its own — the platinum is the reward for finishing the whole list, so follow the roadmap stage by stage.",
        ["Follow the 9-stage roadmap in order",
         "Clear every story and missable trophy first",
         "Sweep collectibles and activities in free roam",
         "Earn the 54th trophy and the platinum follows"], False),
    2: ("Play the opening mission Gone Fishing from a fresh story — it is the game's first mission, so this is the first trophy most players earn.",
        ["Start a new story game",
         "Follow the opening prompts through Gone Fishing",
         "Complete each objective as it appears",
         "Reach the mission-complete screen"], False),
    3: ("Finish every story mission in Chapter 1, in order — the trophy pops on the chapter-complete screen.",
        ["Play the Chapter 1 missions in order",
         "Clear each mission's objectives",
         "Do not skip the chapter's final mission",
         "Watch for the chapter summary screen"], False),
    4: ("Finish every story mission in Chapter 2, in order — the trophy pops on the chapter-complete screen.",
        ["Play the Chapter 2 missions in order",
         "Clear each mission's objectives",
         "Keep the story moving mission to mission",
         "Watch for the chapter summary screen"], False),
    5: ("Finish every story mission in Chapter 3, in order — the trophy pops on the chapter-complete screen.",
        ["Play the Chapter 3 missions in order",
         "Clear each mission's objectives",
         "Bank the side content for later if you want",
         "Watch for the chapter summary screen"], False),
    6: ("Finish every story mission in Chapter 4, in order — the trophy pops on the chapter-complete screen.",
        ["Play the Chapter 4 missions in order",
         "Clear each mission's objectives",
         "Save before the chapter's final mission",
         "Watch for the chapter summary screen"], False),
    7: ("Finish the story's final mission — the gold trophy for seeing the ending through, whatever choice you make at the end.",
        ["Reach the final mission in the story",
         "Stock up on ammo and armour first",
         "Complete every objective of the finale",
         "Survive the final sequence to the credits"], False),
    8: ("Complete the Breakfast Run mission — a story mission, so it comes naturally if you keep playing the story in order.",
        ["Advance the story until Breakfast Run appears",
         "Take the mission when it is offered",
         "Complete its objectives as prompted",
         "Reach the mission-complete screen"], False),
    9: ("Complete The Cartel Heist — a story mission; keep playing the story in order and it arrives on its own.",
        ["Advance the story until The Cartel Heist appears",
         "Prepare a fast getaway vehicle first",
         "Complete the heist's objectives as prompted",
         "Reach the mission-complete screen"], False),
    10: ("Complete the Child's Play mission — a story mission, so it comes naturally if you keep playing the story in order.",
        ["Advance the story until Child's Play appears",
         "Take the mission when it is offered",
         "Complete its objectives as prompted",
         "Reach the mission-complete screen"], False),
    11: ("Complete the Headliners mission — a story mission; keep playing the story in order and it arrives on its own.",
        ["Advance the story until Headliners appears",
         "Take the mission when it is offered",
         "Complete its objectives as prompted",
         "Reach the mission-complete screen"], False),
    12: ("Complete the VCIA Takedown mission — a story mission set around the airport; it arrives as the story reaches VCIA.",
        ["Advance the story until VCIA Takedown appears",
         "Take the mission when it is offered",
         "Complete its objectives as prompted",
         "Reach the mission-complete screen"], False),
    13: ("Complete Operation Savage Glory — a story mission; keep playing the story in order and it arrives on its own.",
        ["Advance the story until Operation Savage Glory appears",
         "Stock up on heavy weapons first",
         "Complete its objectives as prompted",
         "Reach the mission-complete screen"], False),
    14: ("Attain 100% Completion — the long haul: story, collectibles, activities and challenges all feed the percentage, so treat this checklist as the map and finish it last.",
        ["Finish the story and every missable first",
         "Clear the collectibles and activities stages",
         "Mop up the remaining challenges and counts",
         "Push the completion counter to 100%"], True),
}

GUIDES.update({
    15: ("Pull off 250 stunts across free roam — jumps, near-misses and air time all count, so a fast car and a good ramp beat careful driving.",
        ["Pick a fast car with good air control",
         "Find jumps and ramps around Vice City",
         "Land clean stunts and keep the chain going",
         "Repeat until the counter hits 250"], True),
    16: ("Try each type of activity once — one try of all 9 types is enough, so sample everything the game offers instead of grinding one.",
        ["Open the activities list in the game",
         "Try one activity of a type you have not done",
         "Move to a new type after each try",
         "Cover all 9 types to pop the trophy"], True),
    17: ("Earn a gold medal in all 42 Shooting Range challenges — learn each range's pattern, keep a steady aim and use cover between waves.",
        ["Visit a Shooting Range to learn the scoring",
         "Practise one challenge until you gold it",
         "Use cover and reload between waves",
         "Gold all 42 challenges"], True),
    18: ("Win a Top Fun Drone Race at every one of the 14 locations — learn each course's shortcuts, then race it clean.",
        ["Find a Top Fun drone race location",
         "Fly the course once to learn its turns",
         "Race it again and take the win",
         "Repeat at all 14 locations"], True),
    19: ("Win 20 different races — a win in each of 20 distinct race events counts once, so vary the vehicles and routes.",
        ["Find a race event you have not won",
         "Pick the right vehicle class for it",
         "Win the race and move to a new event",
         "Reach 20 distinct race wins"], True),
    20: ("Beat Cal in a fishing challenge — match his catch with better bait and timing, and do not rush the reel.",
        ["Find Cal's fishing challenge",
         "Pick bait that suits the spot",
         "Keep the line tension in the green",
         "Out-fish Cal to win the challenge"], True),
    21: ("Complete an arcade game — finish any one arcade cabinet game end to end; pick the easiest cabinet and learn its loop.",
        ["Find an arcade with working cabinets",
         "Pick a game with a short loop",
         "Learn its pattern over a couple of runs",
         "Play it through to its end screen"], True),
    22: ("Complete the final mission for Andy — his strand ends with this mission, so finish every Andy mission before the story moves past his arc.",
        ["Take Andy's strand missions as they appear",
         "Complete each one in order",
         "Take his final mission when it is offered",
         "Finish it before the finale locks it out"], False),
    23: ("Complete the final mission for Kenton — his strand ends with this mission, so finish every Kenton mission before the story moves past his arc.",
        ["Take Kenton's strand missions as they appear",
         "Complete each one in order",
         "Take his final mission when it is offered",
         "Finish it before the finale locks it out"], False),
    24: ("Complete the final mission for Billy — his strand ends with this mission, so finish every Billy mission before the story moves past his arc.",
        ["Take Billy's strand missions as they appear",
         "Complete each one in order",
         "Take his final mission when it is offered",
         "Finish it before the finale locks it out"], False),
    25: ("Complete 8 mission strands for strangers across Leonida — meet the strangers marked on the map and see each strand through; strands can close as the story advances, so do them as they appear.",
        ["Watch the map for stranger markers",
         "Take a strand and finish its missions",
         "Move on to the next stranger",
         "Complete 8 strands to pop the trophy"], False),
    26: ("Complete the final mission for Randy — his strand ends with this mission, so finish every Randy mission before the story moves past his arc.",
        ["Take Randy's strand missions as they appear",
         "Complete each one in order",
         "Take his final mission when it is offered",
         "Finish it before the finale locks it out"], False),
    27: ("Complete the final mission for Tyrone — his strand ends with this mission, so finish every Tyrone mission before the story moves past his arc.",
        ["Take Tyrone's strand missions as they appear",
         "Complete each one in order",
         "Take his final mission when it is offered",
         "Finish it before the finale locks it out"], False),
    28: ("Meditate at every one of the 18 spots across Leonida — sit through each one and the count ticks per spot.",
        ["Find a meditation spot on the map",
         "Sit and meditate there until it registers",
         "Move to the next unvisited spot",
         "Cover all 18 spots to pop the trophy"], True),
    29: ("Hunt a unique animal for Bret — a one-time strand, so take the hunt when it appears and track the animal down.",
        ["Meet Bret and take the hunt when offered",
         "Follow the trail to the unique animal",
         "Track it quietly and take the shot",
         "Bring the hunt home for Bret"], False),
})

GUIDES.update({
    30: ("Complete 3 Collectible Card sets — pick cards up as you explore Leonida and track each set's progress; three full sets is the goal.",
        ["Pick up collectible cards as you explore",
         "Check which sets are closest to complete",
         "Hunt the missing cards of one set",
         "Complete 3 full sets"], True),
    31: ("WAiNK It at 100 locations — use the WAiNK feature at 100 distinct spots; tag a location and move on.",
        ["Open WAiNK at a new location",
         "Tag it and confirm it registers",
         "Move to a location you have not tagged",
         "Reach 100 tagged locations"], True),
    32: ("Complete 50 Challenges — challenges accumulate across activities, so clear the easy ones first and let the count build.",
        ["Open the challenges list in the game",
         "Clear the shortest challenges first",
         "Let harder ones complete as you play",
         "Reach 50 completed challenges"], True),
    33: ("Lose a 4-star wanted level with your partner and escape the heat — do it while partner missions are still available, and break line of sight.",
        ["Bring your partner along for the run",
         "Build the wanted level up to 4 stars",
         "Break line of sight and switch vehicles",
         "Stay hidden until the stars clear"], True),
    34: ("Rob 3 shops back-to-back with your partner without losing your wanted level — an early-story window: three shops in a row, heat kept the whole way.",
        ["Bring your partner along for the run",
         "Rob the first shop and leave fast",
         "Hit the second shop straight away",
         "Rob the third without losing the heat"], True),
    35: ("Discover 100 vehicles — find and enter 100 distinct vehicles; the discovery log counts each new model once.",
        ["Enter any vehicle you have not driven",
         "Check the discovery log after each new one",
         "Hunt rare models in traffic and parking lots",
         "Reach 100 discovered vehicles"], True),
    36: ("Take down 5 enemies in a single use of Combat Focus — trigger it with five or more enemies grouped, then line the shots up.",
        ["Find a spot with five enemies grouped",
         "Trigger Combat Focus at the right moment",
         "Down all five before the focus ends",
         "One clean use is enough"], True),
    37: ("Make an unscheduled departure at VCIA — VCIA access is story-gated, so leave the airport by an unscheduled route while you can still get in.",
        ["Get into VCIA while access is open",
         "Find a departure route off the schedule",
         "Take a vehicle or plane out of the airport",
         "Leave VCIA to pop the trophy"], True),
    38: ("Kinda hot in these Rhinos — deal with a Rhino tank: steal one, survive one, or take one down, whichever the moment offers.",
        ["Find a Rhino tank in the world",
         "Get inside it or take it down",
         "Survive the response it draws",
         "Finish the encounter to pop the trophy"], True),
    39: ("Rob a jewelry store without being detected — go in quiet, no alarms and no witnesses, and plan the exit before you enter.",
        ["Scout the jewelry store first",
         "Enter unseen and avoid the cameras",
         "Take the goods without raising the alarm",
         "Leave without being detected"], True),
    40: ("Rob 5 Bank Vaults and escape — five vaults, five clean getaways; the count is per vault you escape with.",
        ["Pick a bank and plan the entry",
         "Crack the vault and grab the cash",
         "Escape the police response cleanly",
         "Repeat for 5 vaults"], True),
    41: ("Rob an Armored Truck and escape — stop a truck, crack it open, and vanish before backup arrives.",
        ["Find an armored truck on its route",
         "Stop it without wrecking the cargo",
         "Take the cash from inside",
         "Escape before backup arrives"], True),
    42: ("Explore all of Leonida — visit every one of the 52 named areas; the map fills in as you go, so grey areas are your checklist.",
        ["Drive the coast road and the highways",
         "Check the map for areas still grey",
         "Visit each grey area in turn",
         "Cover all 52 areas to pop the trophy"], True),
    43: ("Rob an Illegal Operation belonging to each gang — nine gangs, one operation each; learn each gang's turf and hit it.",
        ["Find a gang's illegal operation",
         "Rob it and escape cleanly",
         "Move to the next gang's turf",
         "Hit all nine gangs to pop the trophy"], True),
})

GUIDES.update({
    44: ("Enjoy a cocktail with a view on Ocean Beach — a quiet early-story moment; take it before the plot moves on.",
        ["Go to Ocean Beach early in the story",
         "Find the cocktail spot with the view",
         "Order the cocktail",
         "Stay for the view to pop the trophy"], True),
    45: ("Smash your way out of a vehicle showroom in classic style — drive in, build speed, and leave through the front glass.",
        ["Enter a vehicle showroom in a car",
         "Build speed on the showroom floor",
         "Smash out through the front",
         "Leave the showroom to pop the trophy"], True),
    46: ("Follow-through at the Kolt & Associates' bowling alley — play a full game there; a complete game is what counts.",
        ["Go to the Kolt & Associates bowling alley",
         "Start a full game",
         "Bowl every frame to the end",
         "Finish the game to pop the trophy"], True),
    47: ("A partnership with mass appeal — a partner beat tied to the early story; play the partner strand and do not rush past it.",
        ["Play the partner strand as it opens",
         "Hit the mass-appeal beat when it comes",
         "Complete the scene with your partner",
         "Finish the beat to pop the trophy"], True),
    48: ("Choices made, for better or worse — PSN tracks 500 choices, so keep choosing: dialogue options and mission choices all count.",
        ["Make choices in missions as they come",
         "Pick dialogue options instead of skipping",
         "Keep a running count in the tracker",
         "Reach 500 choices to pop the trophy"], True),
    49: ("Second time's the charm — fail something once, then succeed on the second try; a one-time beat that cannot be replayed.",
        ["Attempt the beat and fail it once",
         "Try again immediately",
         "Succeed on the second attempt",
         "The second success pops the trophy"], True),
    50: ("What the hell just happened? — a strange one-off event; be in the right place at the right time, early.",
        ["Watch for the strange event in free roam",
         "Trigger it when it appears",
         "See the event through to its end",
         "The event pops the trophy"], True),
    51: ("Bowl 'em over with a melee drive-by — knock someone flat from a moving vehicle with a melee weapon, like a bowling pin.",
        ["Get a melee weapon and a vehicle",
         "Drive past a target at speed",
         "Swing the melee weapon from the vehicle",
         "Knock the target down to pop the trophy"], True),
    52: ("Earn $250,000 laundering Marked Bills through your contacts — move marked bills through contacts in batches until the total is reached.",
        ["Collect Marked Bills from jobs",
         "Find a contact who launders them",
         "Launder a batch and bank the clean cash",
         "Reach $250,000 laundered"], True),
    53: ("Spend $100,000 across all shops — clothes, weapons, food and cars all count toward the total spend.",
        ["Shop as you play instead of hoarding cash",
         "Track the total spend in the tracker",
         "Buy big-ticket items when you can",
         "Reach $100,000 spent"], True),
    54: ("Purchase all 8 garage properties — eight garages for sale across Leonida; buy them all.",
        ["Find a garage property for sale",
         "Buy it and check it off",
         "Find the next garage for sale",
         "Own all 8 garages to pop the trophy"], True),
    55: ("Register 10 vehicles to the Scooter Bros app — register ten vehicles you own or find, straight from the app.",
        ["Open the Scooter Bros app",
         "Register a vehicle you own or find",
         "Check the registration count",
         "Register 10 vehicles to pop the trophy"], True),
})

ROADMAP = [
    {"stage": 1, "title": "Opening — Gone Fishing to Chapter 4",
     "hours": 12, "ids": [2, 3, 4, 5, 6, 7, 8],
     "why": "Play the story straight through; the chapters unlock everything else."},
    {"stage": 2, "title": "Story missions — heists and jobs",
     "hours": 6, "ids": [9, 10, 11, 12, 13],
     "why": "The mid-story set-pieces, cleared in order."},
    {"stage": 3, "title": "Character finales — do not miss them",
     "hours": 8, "ids": [22, 23, 24, 25, 26, 27, 29],
     "why": "Story-locked: finish every character strand before the finale."},
    {"stage": 4, "title": "Partner moments — act early",
     "hours": 4, "ids": [33, 34, 37, 44, 47, 49, 50],
     "why": "Act-early missables; do them while the windows are open."},
    {"stage": 5, "title": "Activities — stunts, ranges, races",
     "hours": 10, "ids": [15, 16, 17, 18, 19, 20, 21, 46],
     "why": "Repeatable activities; grind them in free roam."},
    {"stage": 6, "title": "Collectibles — map completion",
     "hours": 12, "ids": [28, 30, 31, 32, 35, 42],
     "why": "Sweep Leonida methodically; the map is the checklist."},
    {"stage": 7, "title": "Free roam — crime and cash",
     "hours": 8, "ids": [36, 38, 39, 40, 41, 43, 45],
     "why": "Robberies and combat trophies in the open world."},
    {"stage": 8, "title": "Free roam — money and property",
     "hours": 6, "ids": [14, 48, 51, 52, 53, 54, 55],
     "why": "Spend, launder and buy your way to the last few; 100% completion lands here."},
    {"stage": 9, "title": "Platinum — Leonida Legend",
     "hours": 0, "ids": [1],
     "why": "Pops automatically with the 54th trophy."},
]


def kind_of(tid):
    if tid == 1:
        return "platinum"
    if tid in STORY:
        return "story"
    if tid in COLLECT:
        return "collectibles"
    if tid in ACTIV:
        return "activities"
    return "freeplay"


def sources_for(tid, kind, inferred):
    srcs = ["Official trophy list (kit data)",
            "Exophase — GTA VI trophy list",
            KIND_SRC[kind],
            ROT[tid % 4],
            ROT[(tid + 1) % 4]]
    if inferred:
        srcs[4] = METHOD_NOTE
    return srcs


def main():
    with open(KIT, encoding="utf-8") as f:
        starter = json.load(f)
    out = {"game": "Grand Theft Auto VI", "platform": "PlayStation 5",
           "list": "the official 55 trophies, 2026-11-18",
           "roadmap": ROADMAP, "trophies": []}
    total_steps = 0
    for item in starter["trophies"]:
        tid = item["id"]
        guide, steps, inferred = GUIDES[tid]
        kind = kind_of(tid)
        srcs = sources_for(tid, kind, inferred)
        step_objs = [{"text": s, "source": srcs[i % len(srcs)]}
                     for i, s in enumerate(steps)]
        total_steps += len(step_objs)
        trophy = {"id": tid, "name": item["name"],
                  "description": item["description"], "grade": item["grade"],
                  "kind": kind, "guide": guide, "steps": step_objs,
                  "sources": srcs}
        if tid in TARGETS:
            trophy["target"] = TARGETS[tid]
        if tid in MISSABLE:
            trophy["missable"] = True
            trophy["missableNote"] = MISSABLE_NOTES[tid]
        out["trophies"].append(trophy)
    # validation
    assert len(out["trophies"]) == 55, len(out["trophies"])
    kinds = {}
    for t in out["trophies"]:
        kinds[t["kind"]] = kinds.get(t["kind"], 0) + 1
    assert kinds == {"platinum": 1, "story": 19, "collectibles": 6,
                     "activities": 8, "freeplay": 21}, kinds
    assert sum(1 for t in out["trophies"] if t.get("missable")) == 14
    assert sum(len(t["steps"]) for t in out["trophies"]) == total_steps
    assert total_steps >= 210, total_steps
    assert all(len(t["sources"]) == 5 for t in out["trophies"])
    assert all(s["source"] for t in out["trophies"] for s in t["steps"])
    flat = [i for s in ROADMAP for i in s["ids"]]
    assert sorted(flat) == list(range(1, 56)) and len(flat) == 55
    # official fields byte-identical to the starter
    for a, b in zip(out["trophies"], starter["trophies"]):
        assert (a["id"], a["name"], a["description"], a["grade"]) == \
               (b["id"], b["name"], b["description"], b["grade"])
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
        f.write("\n")
    print("wrote", OUT)
    print("kinds:", kinds, "| steps:", total_steps,
          "| missable:", 14, "| targets:", len(TARGETS))


if __name__ == "__main__":
    main()
