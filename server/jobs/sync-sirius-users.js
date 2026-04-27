process.env.NODE_ENV === "development"
  ? require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` })
  : require("dotenv").config();

const { syncSiriusUsers } = require("../utils/sirius/syncUsers");
const { log, conclude } = require("./helpers/index.js");

(async () => {
  try {
    log("Scheduled Sirius user sync starting...");
    const result = await syncSiriusUsers();
    log(
      `Sirius sync finished — HTTP ${result.status ?? "N/A"} | success: ${result.success}`
    );
  } catch (e) {
    log(`Sirius sync errored: ${e.message}`);
    console.error(e);
  } finally {
    conclude();
  }
})();
