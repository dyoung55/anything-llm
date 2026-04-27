const SIRIUS_SYNC_URL =
  "https://siriusapi.mcswusa.com/DMIND/UpdateAllDMINDUsers";

/**
 * Calls the Sirius API to push updated user metadata into AnythingLLM.
 * Logs every invocation to the server console and EventLogs.
 * @returns {{ success: boolean, status: number|null, error?: string }}
 */
async function syncSiriusUsers() {
  // EventLogs is required lazily to avoid circular-dependency issues in job
  // child processes that also load dotenv themselves.
  const { EventLogs } = require("../../models/eventLogs");
  const apiKey = process.env.SIRIUS_API_KEY;
  const timestamp = new Date().toISOString();

  if (!apiKey) {
    const msg = "SIRIUS_API_KEY is not set — aborting sync.";
    console.warn(`[SiriusSync] ${timestamp} | ${msg}`);
    await EventLogs.logEvent("sirius_user_sync_failed", {
      timestamp,
      error: msg,
    }).catch(() => {});
    return { success: false, status: null, error: msg };
  }

  console.log(`[SiriusSync] ${timestamp} | Calling Sirius user sync API...`);

  let status = null;
  try {
    const response = await fetch(SIRIUS_SYNC_URL, {
      method: "POST",
      headers: {
        "x-api-token": apiKey,
        "Content-Type": "application/json",
      },
    });

    status = response.status;
    const success = response.ok;

    let responseBody = null;
    try {
      responseBody = await response.text();
    } catch {}

    if (success) {
      console.log(
        `[SiriusSync] ${timestamp} | Response: HTTP ${status} OK` +
          (responseBody ? ` | Body: ${responseBody}` : "")
      );
    } else {
      console.error(
        `[SiriusSync] ${timestamp} | Response: HTTP ${status} FAILED` +
          (responseBody ? ` | Body: ${responseBody}` : "")
      );
    }

    await EventLogs.logEvent(
      success ? "sirius_user_sync_success" : "sirius_user_sync_failed",
      { timestamp, status, responseBody }
    ).catch(() => {});

    return { success, status, responseBody };
  } catch (e) {
    console.error(
      `[SiriusSync] ${timestamp} | Network error: ${e.message}`
    );
    await EventLogs.logEvent("sirius_user_sync_failed", {
      timestamp,
      status,
      error: e.message,
    }).catch(() => {});
    return { success: false, status, error: e.message };
  }
}

module.exports = { syncSiriusUsers };
