import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import termkit from 'terminal-kit';
import { LogView } from './logview.js';
import { RingBuffer } from '../ringbuf.js';
import type { PackageState } from '../types.js';

const TERM_WIDTH = 80;
const TERM_HEIGHT = 24;
const CONTENT_HEIGHT = TERM_HEIGHT - 1 - 2; // height - statusbar - borders

const nullStream = new Writable({ write(chunk, enc, cb) { cb(); } });

function createTerminal(): termkit.Terminal {
  const t = termkit.createTerminal({ stdout: nullStream, isTTY: false });
  t.width = TERM_WIDTH;
  t.height = TERM_HEIGHT;
  return t;
}

function createState(lines: string[]): PackageState {
  const logs = new RingBuffer<string>(10000);
  for (const line of lines) {
    logs.push(line);
  }
  return {
    package: { name: 'test-pkg', path: '/test', scripts: {} },
    status: 'running',
    subprocess: null,
    logs,
  };
}

class TestableLogView extends LogView {
  getScreenLines(): string[] {
    return this.screenBuffer.dumpChars()
      .split('\n')
      .map(line => line.trimEnd())
      .filter(line => line.length > 0);
  }

  getScrollOffset(): number {
    return this.scrollOffset;
  }

  getState() {
    return this.currentState;
  }
}

describe('LogView', () => {
  let terminal: termkit.Terminal;
  let logView: TestableLogView;

  beforeEach(() => {
    terminal = createTerminal();
    logView = new TestableLogView(terminal);
  });

  describe('basic rendering', () => {
    it('renders empty state', () => {
      logView.updateState(undefined);
      assert.deepEqual(logView.getScreenLines(), []);
    });

    it('renders a few log lines', () => {
      const state = createState(['line 1', 'line 2', 'line 3']);
      logView.updateState(state);
      assert.deepEqual(logView.getScreenLines(), ['line 1', 'line 2', 'line 3']);
    });

    it('renders only last contentHeight lines when logs exceed viewport', () => {
      const lines = Array.from({ length: 50 }, (_, i) => `line ${i}`);
      const state = createState(lines);
      logView.updateState(state);

      const visible = logView.getScreenLines();
      assert.equal(visible.length, CONTENT_HEIGHT);
      assert.equal(visible[visible.length - 1], 'line 49');
      assert.equal(visible[0], `line ${50 - CONTENT_HEIGHT}`);
    });

    it('appends new lines and re-renders', () => {
      const state = createState(['line 1']);
      logView.updateState(state);

      state.logs.push('line 2');
      logView.appendLines(['line 2']);

      assert.deepEqual(logView.getScreenLines(), ['line 1', 'line 2']);
    });

    it('shows latest lines after many appends', () => {
      const state = createState([]);
      logView.updateState(state);

      for (let i = 0; i < 50; i++) {
        state.logs.push(`line ${i}`);
        logView.appendLines([`line ${i}`]);
      }

      const visible = logView.getScreenLines();
      assert.equal(visible.length, CONTENT_HEIGHT);
      assert.equal(visible[visible.length - 1], 'line 49');
    });
  });

  describe('updateState', () => {
    it('resets scroll offset when switching packages', () => {
      const state1 = createState(Array.from({ length: 50 }, (_, i) => `pkg1 line ${i}`));
      logView.updateState(state1);

      const state2 = createState(['pkg2 line 0']);
      logView.updateState(state2);
      assert.equal(logView.getScrollOffset(), 0);
      assert.deepEqual(logView.getScreenLines(), ['pkg2 line 0']);
    });
  });

  describe('clearLogs', () => {
    it('resets scroll offset', () => {
      const lines = Array.from({ length: 50 }, (_, i) => `line ${i}`);
      const state = createState(lines);
      logView.updateState(state);

      logView.clearLogs();
      assert.equal(logView.getScrollOffset(), 0);
    });
  });
});
