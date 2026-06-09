/*
 * FATHOM — lore. A light narrative frame so the abstract top-down dive has a
 * reason and a mounting dread, surfaced as an intro crawl (first run) and as
 * crew-log fragments recovered as you descend. Pure flavor — it never gates the
 * arcade loop.
 */
(function (F) {
  'use strict';

  F.LORE = {
    // Shown once, on the first ever descent (intro scene).
    intro: [
      'The deep-survey vessel FATHOM went dark at eight hundred metres.',
      'Twelve crew. No distress call. No wreckage ever surfaced.',
      'You went down to recover their transponders — and them, if any were left.',
      'Then your lamp died.',
      'There is something in the wreck. It is blind, like you.',
      'It learned the sound of a held breath.',
      '',
      'Recover the signals. Go deeper. Do not let it hear you.'
    ],

    // A one-line fragment surfaced at the start of these depths (atmospheric).
    depthLogs: {
      2: 'crew log 04  —  "the sonar is useless. it doesn\'t see. it listens."',
      3: 'crew log 09  —  "we stopped speaking on the third day. it didn\'t help."',
      4: 'crew log 17  —  "there is more than one of them now."',
      5: 'crew log 22  —  "whatever you do. do not ping at the door."',
      7: 'crew log 31  —  "the lower decks are flooded black. it is faster down here."',
      10: 'transponder 02  —  "if you can hear this, you are already too deep. turn back."',
      13: 'there are no more logs.'
    },

    // Surfaced if the player reaches a milestone depth (encouragement + dread).
    milestone: {
      5: 'you have passed where the crew\'s signals end.',
      10: 'no one has ever come back from this deep.'
    }
  };
})(window.FATHOM = window.FATHOM || {});
