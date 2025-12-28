#!/bin/bash

# Exit early
# See: https://www.gnu.org/savannah-checkouts/gnu/bash/manual/bash.html#The-Set-Builtin
set -e

# About:
#
# This is a helper script to tag and push a new release. GitHub Actions use
# release tags to allow users to select a specific version of the action to use.
#
# See: https://github.com/actions/typescript-action#publishing-a-new-release
# See: https://github.com/actions/toolkit/blob/master/docs/action-versioning.md#recommendations
#
# This script will do the following:
#
# 1. Retrieve the latest release tag
# 2. Display the latest release tag
# 3. Prompt the user for a new release tag
# 4. Validate the new release tag
# 5. Remind user to update the version field in package.json
# 6. Tag a new release
# 7. Set 'is_major_release' variable
# 8. Point separate major release tag (e.g. v1, v2) to the new release
# 9. Push the new tags (with commits, if any) to remote
# 10. If this is a major release, create a 'releases/v#' branch and push
#
# Usage:
#
# script/release

# Variables
semver_tag_regex='v[0-9]+\.[0-9]+\.[0-9]+$'
semver_tag_glob='v[0-9].[0-9].[0-9]*'
git_remote='origin'
major_semver_tag_regex='\(v[0-9]*\)'

# Terminal colors
OFF='\033[0m'
BOLD_RED='\033[1;31m'
BOLD_GREEN='\033[1;32m'
BOLD_BLUE='\033[1;34m'
BOLD_PURPLE='\033[1;35m'
BOLD_UNDERLINED='\033[1;4m'
BOLD='\033[1m'

# 1. Retrieve the latest release tag
if ! latest_tag=$(git describe --abbrev=0 --match="$semver_tag_glob"); then
	# There are no existing release tags
	echo -e "No tags found (yet) - Continue to create and push your first tag"
	latest_tag="[unknown]"
fi

# 2. Display the latest release tag
echo -e "The latest release tag is: ${BOLD_BLUE}${latest_tag}${OFF}"

# 3. Prompt the user for a new release tag
read -r -p 'Enter a new release tag (vX.X.X format): ' new_tag

# 4. Validate the new release tag
if echo "$new_tag" | grep -q -E "$semver_tag_regex"; then
	# Release tag is valid
	echo -e "Tag: ${BOLD_BLUE}$new_tag${OFF} is valid syntax"
else
	# Release tag is not in `vX.X.X` format
	echo -e "Tag: ${BOLD_BLUE}$new_tag${OFF} is ${BOLD_RED}not valid${OFF} (must be in ${BOLD}vX.X.X${OFF} format)"
	exit 1
fi

# 5. Remind user to update the version field in package.json
echo -e -n "Make sure the version field in package.json is ${BOLD_BLUE}$new_tag${OFF}. Yes? [Y/${BOLD_UNDERLINED}n${OFF}] "
read -r YN

if [[ ! ($YN == "y" || $YN == "Y") ]]; then
	# Package.json version field is not up to date
	echo -e "Please update the package.json version to ${BOLD_PURPLE}$new_tag${OFF} and commit your changes"
	exit 1
fi

# 6. Tag a new release
git tag "$new_tag" --annotate --message "$new_tag Release"
echo -e "Tagged: ${BOLD_GREEN}$new_tag${OFF}"

# 7. Set 'is_major_release' variable
new_major_release_tag=$(expr "$new_tag" : "$major_semver_tag_regex")

if [[ "$latest_tag" = "[unknown]" ]]; then
	# This is the first major release
	is_major_release='yes'
else
	# Compare the major version of the latest tag with the new tag
	latest_major_release_tag=$(expr "$latest_tag" : "$major_semver_tag_regex")

	if ! [[ "$new_major_release_tag" = "$latest_major_release_tag" ]]; then
		is_major_release='yes'
	else
		is_major_release='no'
	fi
fi

# 8. Point separate major release tag (e.g. v1, v2) to the new release
if [ $is_major_release = 'yes' ]; then
	# Create a new major version tag and point it to this release
	git tag "$new_major_release_tag" --annotate --message "$new_major_release_tag Release"
	echo -e "New major version tag: ${BOLD_GREEN}$new_major_release_tag${OFF}"
else
	# Update the major version tag to point it to this release
	git tag "$latest_major_release_tag" --force --annotate --message "Sync $latest_major_release_tag tag with $new_tag"
	echo -e "Synced ${BOLD_GREEN}$latest_major_release_tag${OFF} with ${BOLD_GREEN}$new_tag${OFF}"
fi

# 9. Push the new tags (with commits, if any) to remote
git push --follow-tags

if [ $is_major_release = 'yes' ]; then
	# New major version tag is pushed with the '--follow-tags' flags
	echo -e "Tags: ${BOLD_GREEN}$new_major_release_tag${OFF} and ${BOLD_GREEN}$new_tag${OFF} pushed to remote"
else
	# Force push the updated major version tag
	git push $git_remote "$latest_major_release_tag" --force
	echo -e "Tags: ${BOLD_GREEN}$latest_major_release_tag${OFF} and ${BOLD_GREEN}$new_tag${OFF} pushed to remote"
fi

# 10. If this is a major release, create a 'releases/v#' branch and push
if [ $is_major_release = 'yes' ]; then
	git branch "releases/$new_major_release_tag" "$new_major_release_tag"
	echo -e "Branch: ${BOLD_BLUE}releases/$new_major_release_tag${OFF} created from ${BOLD_BLUE}$new_major_release_tag${OFF} tag"
	git push --set-upstream $git_remote "releases/$new_major_release_tag"
	echo -e "Branch: ${BOLD_GREEN}releases/$new_major_release_tag${OFF} pushed to remote"
fi

# Completed
echo -e "${BOLD_GREEN}Done!${OFF}"
