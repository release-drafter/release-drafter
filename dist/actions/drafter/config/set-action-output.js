import { c as coreExports } from "../../../core.js";
const setActionOutput = (params) => {
  const { releasePayload, upsertedRelease } = params;
  const {
    data: {
      id: releaseId,
      html_url: htmlUrl,
      upload_url: uploadUrl,
      tag_name: tagName,
      name
    }
  } = upsertedRelease;
  const { resolvedVersion, majorVersion, minorVersion, patchVersion, body } = releasePayload;
  if (releaseId && Number.isInteger(releaseId))
    coreExports.setOutput("id", releaseId.toString());
  if (htmlUrl) coreExports.setOutput("html_url", htmlUrl);
  if (uploadUrl) coreExports.setOutput("upload_url", uploadUrl);
  if (tagName) coreExports.setOutput("tag_name", tagName);
  if (name) coreExports.setOutput("name", name);
  if (resolvedVersion) coreExports.setOutput("resolved_version", resolvedVersion);
  if (majorVersion) coreExports.setOutput("major_version", majorVersion);
  if (minorVersion) coreExports.setOutput("minor_version", minorVersion);
  if (patchVersion) coreExports.setOutput("patch_version", patchVersion);
  coreExports.setOutput("body", body);
};
export {
  setActionOutput
};
