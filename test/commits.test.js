const commits = require('../lib/commits');


const mockCommit = message => ({ commit: { message }});


describe('extractPullRequestNumber', () => {
  it('extracts from merge commit message', () => {
    expect(
      commits.extractPullRequestNumber(mockCommit(
        'Merge pull request #37 from JasonEtco/patch-1'))
      ).toEqual("37");
  });

  it('extracts from squash & merge commit message', () => {
    expect(
      commits.extractPullRequestNumber(mockCommit(
        `
Fixed conditional card state on 1st render (#1537)

* Fixed conditional card state on 1st render

* Moved method to correct location
        `.trim()))
      ).toEqual("1537");
  });
});
