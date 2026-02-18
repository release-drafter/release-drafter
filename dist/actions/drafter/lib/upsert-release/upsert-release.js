import { c as coreExports } from "../../../../core.js";
import { createRelease } from "./create-release.js";
import { updateRelease } from "./update-release.js";
const upsertRelease = async (params) => {
  const { draftRelease, releasePayload } = params;
  if (!draftRelease) {
    coreExports.info("Creating new release...");
    const res = await createRelease({
      releasePayload
    });
    coreExports.info("Release created!");
    return res;
  } else {
    coreExports.info("Updating existing release...");
    const res = await updateRelease({
      draftRelease,
      releasePayload
    });
    coreExports.info("Release updated!");
    return res;
  }
};
export {
  upsertRelease
};
