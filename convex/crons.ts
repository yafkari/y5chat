import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Reset chat counts for pro users every month on the 1st day at 12:00 AM UTC
crons.monthly(
  "reset pro user chat counts",
  { day: 1, hourUTC: 0, minuteUTC: 0 },
  internal.users.resetProUserChatCounts,
);

// Reset chat counts for authenticated free users every day at 12:00 AM UTC
crons.daily(
  "reset free user daily chat counts", 
  { hourUTC: 0, minuteUTC: 0 },
  internal.users.resetFreeUserDailyChatCounts,
);

export default crons; 