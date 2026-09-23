import { normalizeCompletedHistory } from "./persistence.js?v=13";

export function deriveHistoryStatistics(history) {
  const hands = normalizeCompletedHistory(history);
  const statistics = {
    completedHands: hands.length,
    eastWins: 0,
    losses: 0,
    draws: 0,
    totalPlayedMs: 0,
    averagePlayedMs: 0,
    winRate: 0,
  };

  hands.forEach((hand) => {
    statistics.totalPlayedMs += hand.playedMs;
    if (hand.winner === 0) statistics.eastWins += 1;
    else if (hand.winner === null) statistics.draws += 1;
    else statistics.losses += 1;
  });

  statistics.averagePlayedMs = statistics.completedHands
    ? statistics.totalPlayedMs / statistics.completedHands
    : 0;
  statistics.winRate = statistics.completedHands
    ? statistics.eastWins / statistics.completedHands
    : 0;
  return statistics;
}
