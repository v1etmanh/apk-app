# Cat family assets

Created 2026-11-18.

Eight transparent PNG visual references were generated with the built-in image_gen tool.
Eight simplified, editable vector animations were then drawn and exported using LottieFiles Creator MCP.
The vector artwork follows the references' character identities and colors; it is not a pixel-exact trace.

## Files and actions

- lottie/father.json — orange father in navy suit, adjusting burgundy tie.
- lottie/mother.json — blue-gray British Shorthair mother, three hair clips, money and sparkling eyes.
- lottie/brother.json — calico older brother, purple eye bags, sleepy blink and head nod.
- lottie/kitten.json — golden British Shorthair kitten, mint overalls, sparkling eyes and head tilt.
- lottie/grandpa.json — charcoal British Shorthair grandfather, silver beard, gentle beard-stroking motion.
- lottie/grandma.json — white grandmother, reading glasses, lavender dress, sewing pink fabric with needle and thread.
- lottie/sister.json — Arabian Mau older sister, sandy fur, plum dress, applying makeup with brush and compact mirror.
- lottie/tabby-girl.json — brown tabby younger sister, Louis Vuitton motif tee, blue jeans, white sneakers, wink and peace-sign wave.
- references/ — eight original transparent PNG references.
- source/reference-prompts.json — final image prompt set.
- source/creator-family.js — source for LottieFiles Creator; run in a NEW document per character, passing params.kind.
- source/creator-family-additions.js — source for grandma, sister and tabby-girl; run in a NEW document per character, passing params.kind.
- source/addition-prompts.json — image prompt set for the three additional characters.

## Playback

512 x 512; 30 fps; 90 frames; 3 seconds.
Enable looping in the consuming Lottie player.
Transparent background; no embedded bitmap assets, fonts, or external assets.
The animations are not yet wired into the mobile app.

## Creator documents

- cat-family-father-20261118 (revision 2)
- cat-family-mother-20261118 (revision 1)
- cat-family-brother-20261118 (revision 1)
- cat-family-kitten-20261118 (revision 1)
- cat-family-grandpa-20261118 (revision 1)
- cat-family-grandma-20261118 (revision 1)
- cat-family-sister-20261118 (revision 1)
- cat-family-tabby-girl-20261118 (revision 1)

## Verification

Creator rendered four sampled poses per character, including blink poses for mother, brother, kitten and grandpa.
Father's tie animation was corrected to use parent-local coordinates.
The three additions were reviewed at 0, 0.65, 1.3 and 2.33 seconds in Creator filmstrips.
All eight JSON files parse and report 512 x 512, 30 fps, 90 frames, and zero external assets.
Target mobile-player playback has not been tested.

