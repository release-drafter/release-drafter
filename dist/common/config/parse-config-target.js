function parseConfigTarget(target, context) {
  let _target = structuredClone(target).trim();
  const getErr = (m) => new Error(
    `invalid format: "${_target}". Expected format [github:][owner/repo:]filepath[@ref] or file:filepath. ${m}`
  );
  if (_target.includes(" ")) {
    throw getErr("Target must not contain spaces.");
  }
  const scheme = _target.startsWith("file:") ? "file" : "github";
  if (_target.startsWith("file:")) _target = _target.slice(5);
  if (_target.startsWith("github:")) _target = _target.slice(7);
  const hasRepoSpecifier = _target.includes(":");
  const hasRefSpecifier = _target.includes("@");
  if (scheme === "file") {
    if (hasRepoSpecifier)
      throw getErr('Local file targets cannot have ":" github specifiers.');
    if (hasRefSpecifier)
      throw getErr('Local file targets cannot have "@" github specifiers.');
  }
  const parts = _target.split(":").flatMap((part) => part.split("@"));
  let targetRepo;
  let targetRef;
  if (parts.length > 3) throw getErr('":" or "@" was specified more than once.');
  if (hasRepoSpecifier) {
    if (parts.length < 2) throw getErr("Missing repo specifier.");
    const repoSpecifier = parts[0];
    const repoParts = repoSpecifier.split("/");
    let targetRepoOwner;
    let targetRepoName;
    if (!repoParts.length) throw getErr("Missing repo specifier.");
    if (repoParts.length > 2) throw getErr('"/" specified more than once.');
    if (repoParts.length === 2) {
      targetRepoOwner = repoParts[0];
      targetRepoName = repoParts[1];
    } else {
      targetRepoName = repoParts[0];
      targetRepoOwner = context.repo.owner;
    }
    targetRepo = { owner: targetRepoOwner, repo: targetRepoName };
  } else {
    targetRepo = context.repo;
  }
  const isCurrentRepo = context.repo.owner === targetRepo.owner && context.repo.repo === targetRepo.repo;
  if (hasRefSpecifier) {
    if (parts.length < 2) throw getErr("Too short to contain ref specifier.");
    const refSpecifier = parts.at(-1);
    if (!refSpecifier) throw getErr("Missing ref specifier.");
    if (!refSpecifier.length) throw getErr("Ref specifier is empty.");
    targetRef = refSpecifier;
  } else {
    targetRef = isCurrentRepo ? context.ref : void 0;
  }
  const filepathIndex = hasRepoSpecifier ? 1 : 0;
  const targetFilepath = parts.at(filepathIndex);
  if (!targetFilepath) throw getErr("Missing filepath.");
  return {
    scheme,
    filepath: targetFilepath,
    ref: targetRef,
    repo: targetRepo
  };
}
export {
  parseConfigTarget
};
