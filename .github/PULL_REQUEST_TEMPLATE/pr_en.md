First of all, thank you for your contribution! 😄

First confirm the target product and Web versions under the [versioning and compatibility policy](https://github.com/aihohu/hohu-admin/blob/main/docs/VERSIONING.md); both must match the full Backend version. Branch daily code changes as `feat/*` or `fix/*` from the corresponding `release/<version>` and target that release branch. After release acceptance, open the release integration PR against `main`. Follow the policy's specified paths for ordinary documentation copy edits and initial CI governance changes. Complete the information below; merge only after maintainer review and applicable checks pass.

[[中文版模板 / Chinese template](./pr_cn.md)]

### Release scope

- Target product / Web version:
- Target branch:
- Scope for this release and related Backend PRs (if any):
- Complete user journeys and results from the first runnable candidate (N/A for prose-only changes):
- Redacted evidence locations for credentials, exclusive-writer and network readiness (N/A without release impact):
- Public product status: [Docs release notes](https://github.com/aihohu/hohu-admin-docs/blob/main/docs/guide/reference/versions.md). Do not paste credentials or sensitive internal records.

### This is a ...

- [ ] New feature
- [ ] Bug fix
- [ ] Site / document update
- [ ] Component style update
- [ ] TypeScript definition update
- [ ] Refactoring
- [ ] Code style optimization
- [ ] Branch merge
- [ ] Other (about what?)

### What's the background?

> 1. Describe the source of requirement.
> 2. Resolve what problem.
> 3. Related issue link.

### API Realization (Optional if not new feature)

> 1. Basic thought of solution and other optional proposal.
> 2. List final API realization and usage sample.
> 3. GIF or snapshot should be provided if includes UI/interactive modification.

### What's the effect? (Optional if not new feature)

> 1. Does this PR affect user? Which part will be affected?
> 2. What will say in changelog?
> 3. Does this PR contains potential break change or other risk?

### Changelog description (Optional if not new feature)

> 1. English description
> 2. Chinese description (optional)

### Self Check before Merge

- [ ] Target versions and branch follow the policy; any applicable exception is justified
- [ ] Doc is updated/provided or not needed
- [ ] Demo is updated/provided or not needed
- [ ] TypeScript definition is updated/provided or not needed
- [ ] Changelog is provided or not needed

### Additional Plan? (Optional if not new feature)

> If this PR related with other PR or following info. You can type here.
