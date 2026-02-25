import * as assert from "node:assert";

// Minimal vscode mocks for AutoRefreshManager
let focusCallback: ((state: { focused: boolean }) => void) | undefined;
let fileWatcherCallbacks: Array<() => void> = [];
let mockIntervalSeconds = 30;

const mockVscode = {
	workspace: {
		createFileSystemWatcher: (_pattern: string) => {
			const watcher = {
				onDidCreate: (cb: () => void) => {
					fileWatcherCallbacks.push(cb);
				},
				onDidChange: (cb: () => void) => {
					fileWatcherCallbacks.push(cb);
				},
				onDidDelete: (cb: () => void) => {
					fileWatcherCallbacks.push(cb);
				},
				dispose: () => {},
			};
			return watcher;
		},
		onDidChangeConfiguration: (
			_cb: (e: { affectsConfiguration: (s: string) => boolean }) => void,
		) => {
			return { dispose: () => {} };
		},
		getConfiguration: (_section: string) => ({
			get: (_key: string, defaultValue: number) =>
				mockIntervalSeconds ?? defaultValue,
		}),
	},
	window: {
		onDidChangeWindowState: (cb: (state: { focused: boolean }) => void) => {
			focusCallback = cb;
			return { dispose: () => {} };
		},
	},
};

// Inject mock before importing the module
// biome-ignore lint: test setup requires dynamic require
const Module = require("module");
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (
	request: string,
	parent: unknown,
	isMain: boolean,
	options: unknown,
) {
	if (request === "vscode") {
		return "vscode";
	}
	return originalResolve.call(this, request, parent, isMain, options);
};
require.cache.vscode = {
	id: "vscode",
	filename: "vscode",
	loaded: true,
	exports: mockVscode,
} as unknown as NodeModule;

// Now import the real module
import { AutoRefreshManager } from "../../autoRefresh";

describe("AutoRefreshManager", () => {
	let refreshCount: number;
	let manager: AutoRefreshManager;

	beforeEach(() => {
		refreshCount = 0;
		fileWatcherCallbacks = [];
		focusCallback = undefined;
		mockIntervalSeconds = 30;
	});

	afterEach(() => {
		if (manager) {
			manager.dispose();
		}
	});

	it("calls onRefresh via debounce when a filesystem event fires", (done) => {
		manager = new AutoRefreshManager(() => {
			refreshCount++;
		});

		// Trigger a file watcher callback
		assert.ok(fileWatcherCallbacks.length > 0, "should register FS callbacks");
		fileWatcherCallbacks[0]();

		// Should not fire immediately (debounced)
		assert.strictEqual(refreshCount, 0);

		// Wait past the 300ms debounce
		setTimeout(() => {
			assert.strictEqual(refreshCount, 1);
			done();
		}, 350);
	});

	it("debounces multiple rapid filesystem events into one refresh", (done) => {
		manager = new AutoRefreshManager(() => {
			refreshCount++;
		});

		// Fire several FS events rapidly
		fileWatcherCallbacks[0]();
		fileWatcherCallbacks[1]();
		fileWatcherCallbacks[2]();

		setTimeout(() => {
			assert.strictEqual(refreshCount, 1, "should debounce to a single call");
			done();
		}, 350);
	});

	it("calls onRefresh when window regains focus", (done) => {
		manager = new AutoRefreshManager(() => {
			refreshCount++;
		});

		assert.ok(focusCallback, "should register focus listener");
		if (focusCallback) focusCallback({ focused: true });

		setTimeout(() => {
			assert.strictEqual(refreshCount, 1);
			done();
		}, 350);
	});

	it("does not refresh when window loses focus", (done) => {
		manager = new AutoRefreshManager(() => {
			refreshCount++;
		});

		if (focusCallback) focusCallback({ focused: false });

		setTimeout(() => {
			assert.strictEqual(refreshCount, 0);
			done();
		}, 350);
	});

	it("cleans up on dispose without errors", () => {
		manager = new AutoRefreshManager(() => {
			refreshCount++;
		});

		// Should not throw
		manager.dispose();
	});

	it("stops debounce timer on dispose", (done) => {
		manager = new AutoRefreshManager(() => {
			refreshCount++;
		});

		fileWatcherCallbacks[0]();
		manager.dispose();

		// The pending debounce should have been cancelled
		setTimeout(() => {
			assert.strictEqual(refreshCount, 0, "disposed manager should not fire");
			done();
		}, 350);
	});
});
