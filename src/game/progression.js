/*
 * FATHOM — progression: how the descent escalates, forever.
 *
 * Like Tetris speeding up, every depth turns one screw: the Angler swims faster,
 * air is scarcer, the dark presses closer, and eventually a second and third
 * Angler join. The curve is gentle early (teaching) and unbounded late
 * (mastery), so the game is "easy to learn, impossible to master".
 */
(function (F) {
  'use strict';

  const Progression = {
    forDepth(depth) {
      const S = F.SCALING, C = F.CONFIG;
      const entitySpeed = Math.min(S.entitySpeedMax, C.entity.baseSpeed + (depth - 1) * S.entitySpeedPerDepth);
      const oxygenStart = Math.max(S.oxygenMinStart, C.oxygen.start - (depth - 1) * S.oxygenLossPerDepth);
      const entityCount = Math.min(S.maxEntities, 1 + Math.floor((depth - 1) / S.extraEntityEveryDepths));
      const visMult = Math.max(S.minPassiveVisionMult, 1 - (depth - 1) * S.darknessPerDepth);
      const passiveVision = C.ping.passiveVision * visMult;
      const hearMult = Math.min(S.hearGrowthMax, 1 + (depth - 1) * S.hearGrowthPerDepth);
      return { depth, entitySpeed, oxygenStart, entityCount, passiveVision, hearMult };
    }
  };

  F.Progression = Progression;
})(window.FATHOM = window.FATHOM || {});
