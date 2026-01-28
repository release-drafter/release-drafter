import { c as coreExports } from "../../../../core.js";
import { createRelease } from "./create-release.js";
import { updateRelease } from "./update-release.js";
const upsertRelease = async (params) => {
  const { draftRelease, releasePayload } = params;
  if (!draftRelease) {
    coreExports.info("Creating new release");
    return await createRelease({
      releasePayload
    });
  } else {
    coreExports.info("Updating existing release");
    return await updateRelease({
      draftRelease,
      releasePayload
    });
  }
};
export {
  upsertRelease
};
