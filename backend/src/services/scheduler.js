const cron = require('node-cron');
const { get, run, all } = require('../config/db');
const emailQueue = require('./emailQueue');

let cronTask = null;

const checkPendingScheduledJobs = async () => {
  try {
    const nowIso = new Date().toISOString();
    // Fetch all pending jobs whose scheduled time has arrived
    const dueJobs = await all(
      `SELECT sj.*, c.status as campaign_status 
       FROM scheduled_jobs sj 
       JOIN campaigns c ON sj.campaign_id = c.id 
       WHERE sj.status = 'pending' AND sj.run_at <= CURRENT_TIMESTAMP`,
      []
    );

    for (const job of dueJobs) {
      console.log(`[Scheduler] Triggering due scheduled job #${job.id} for Campaign #${job.campaign_id}`);

      // Mark job processing
      await run("UPDATE scheduled_jobs SET status = 'processing' WHERE id = ?", [job.id]);

      try {
        await emailQueue.enqueueCampaign(job.campaign_id, job.user_id);
        await run("UPDATE scheduled_jobs SET status = 'completed' WHERE id = ?", [job.id]);
        console.log(`[Scheduler] Campaign #${job.campaign_id} enqueued successfully.`);
      } catch (err) {
        console.error(`[Scheduler] Error triggering scheduled job #${job.id}:`, err);
        await run("UPDATE scheduled_jobs SET status = 'failed' WHERE id = ?", [job.id]);
      }
    }
  } catch (err) {
    console.error('[Scheduler] Error checking pending scheduled jobs:', err);
  }
};

const initScheduler = () => {
  if (cronTask) {
    cronTask.stop();
  }

  // Check every 30 seconds for due jobs
  cronTask = cron.schedule('*/30 * * * * *', async () => {
    await checkPendingScheduledJobs();
  });

  // Run an immediate check on startup to pick up any jobs that matured while server was offline
  checkPendingScheduledJobs();

  console.log(' Scheduler initialized. Pending jobs will survive server restarts.');
};

const scheduleCampaign = async (userId, campaignId, runAtDate) => {
  const runAtIso = new Date(runAtDate).toISOString();

  // Create scheduled job record
  const result = await run(
    "INSERT INTO scheduled_jobs (user_id, campaign_id, run_at, status) VALUES (?, ?, ?, 'pending')",
    [userId, campaignId, runAtIso]
  );

  // Update campaign status
  await run(
    "UPDATE campaigns SET status = 'scheduled', scheduled_at = ? WHERE id = ?",
    [runAtIso, campaignId]
  );

  return { jobId: result.lastID, runAt: runAtIso };
};

const cancelScheduledJob = async (jobId, userId) => {
  const job = await get('SELECT * FROM scheduled_jobs WHERE id = ? AND user_id = ?', [jobId, userId]);
  if (!job) {
    throw new Error('Scheduled job not found or unauthorized.');
  }

  await run("UPDATE scheduled_jobs SET status = 'cancelled' WHERE id = ?", [jobId]);
  await run("UPDATE campaigns SET status = 'cancelled' WHERE id = ?", [job.campaign_id]);

  return { success: true, message: 'Scheduled campaign cancelled.' };
};

module.exports = {
  initScheduler,
  checkPendingScheduledJobs,
  scheduleCampaign,
  cancelScheduledJob
};
