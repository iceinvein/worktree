import * as assert from "node:assert";
import { isValidBranchName } from "../../utils/validation";

describe("isValidBranchName", () => {
	it("accepts simple branch names", () => {
		assert.strictEqual(isValidBranchName("feature/login"), true);
		assert.strictEqual(isValidBranchName("bugfix-123"), true);
		assert.strictEqual(isValidBranchName("release/v1.0.0"), true);
	});

	it("accepts branch names with dots and underscores", () => {
		assert.strictEqual(isValidBranchName("feature/my_branch"), true);
		assert.strictEqual(isValidBranchName("v1.2.3-hotfix"), true);
	});

	it("rejects names with shell metacharacters", () => {
		assert.strictEqual(isValidBranchName("branch; rm -rf /"), false);
		assert.strictEqual(isValidBranchName("branch$(whoami)"), false);
		assert.strictEqual(isValidBranchName("branch`id`"), false);
		assert.strictEqual(isValidBranchName('branch"quoted"'), false);
		assert.strictEqual(isValidBranchName("branch|pipe"), false);
		assert.strictEqual(isValidBranchName("branch&bg"), false);
	});

	it("rejects empty or whitespace-only names", () => {
		assert.strictEqual(isValidBranchName(""), false);
		assert.strictEqual(isValidBranchName("  "), false);
	});

	it("rejects names with spaces", () => {
		assert.strictEqual(isValidBranchName("my branch"), false);
	});

	it("rejects git-invalid patterns", () => {
		assert.strictEqual(isValidBranchName("branch..name"), false);
		assert.strictEqual(isValidBranchName("branch~1"), false);
		assert.strictEqual(isValidBranchName("branch^2"), false);
		assert.strictEqual(isValidBranchName("branch:ref"), false);
		assert.strictEqual(isValidBranchName(".hidden"), false);
		assert.strictEqual(isValidBranchName("branch.lock"), false);
	});
});
