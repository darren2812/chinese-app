import assert from "node:assert/strict";
import { test } from "node:test";
import { playAudioResponse } from "../src/lib/messageAudio.ts";

// Model the browser events, keeping network reads and media appends separate.
// Audible decoding still needs a real-browser check with a generated reply.
function fixture({ chunks = [25, 50, 25], supported = true, failAppend = false,
  waitForEnd = false, playError, abortOnRead = false } = {}) {
  const controller = new AbortController();
  const state = { reads: 0, sources: [], plays: [], cached: null, released: false };
  let finishPlayback;
  class SourceBuffer extends EventTarget {
    seconds = 0;
    get buffered() {
      const seconds = this.seconds;
      return { length: seconds ? 1 : 0, start: () => 0, end: () => seconds };
    }
    appendBuffer(bytes) {
      this.seconds += bytes[0] / 100;
      queueMicrotask(() => this.dispatchEvent(new Event(failAppend ? "error" : "updateend")));
    }
  }
  class MediaSource extends EventTarget {
    static isTypeSupported() { return supported; }
    readyState = "closed";
    addSourceBuffer() { return new SourceBuffer(); }
    endOfStream() {
      this.readyState = "ended";
      finishPlayback?.();
    }
  }
  globalThis.MediaSource = MediaSource;
  const audio = new EventTarget();
  audio.currentTime = 0;
  audio.pause = () => {};
  audio.play = () => {
    state.plays.push({ reads: state.reads, time: audio.currentTime });
    if (playError) return Promise.reject(playError);
    if (waitForEnd) return new Promise((resolve) => { finishPlayback = resolve; });
    return Promise.resolve();
  };
  const response = {
    body: {
      getReader: () => ({
        read: async () => {
          if (abortOnRead) controller.abort();
          const index = state.reads++;
          return index < chunks.length
            ? { value: Uint8Array.of(chunks[index]), done: false }
            : { done: true };
        },
        releaseLock: () => { state.released = true; },
      }),
    },
  };
  const run = () => playAudioResponse(response, audio, controller.signal, (source) => {
    state.sources.push(source);
    if (source instanceof MediaSource) {
      queueMicrotask(() => {
        source.readyState = "open";
        source.dispatchEvent(new Event("sourceopen"));
      });
    }
  }, (blob) => { state.cached = blob; });
  return { state, run };
}

test("starts at the beginning after 750ms is buffered, before download finishes", async () => {
  const { state, run } = fixture();
  await run();
  assert.deepEqual(state.plays, [{ reads: 2, time: 0 }]);
  assert.deepEqual([...new Uint8Array(await state.cached.arrayBuffer())], [25, 50, 25]);
  assert.equal(state.released, true);
});

test("plays replies shorter than the startup buffer after download ends", async () => {
  const { state, run } = fixture({ chunks: [25] });
  await run();
  assert.deepEqual(state.plays, [{ reads: 2, time: 0 }]);
});

test("continues appending while the play promise is pending", async () => {
  const { state, run } = fixture({ waitForEnd: true });
  await run();
  assert.equal(state.reads, 4);
  assert.equal(state.sources.length, 1);
});

test("unsupported browsers buffer and play the same complete response", async () => {
  const { state, run } = fixture({ supported: false });
  await run();
  assert.equal(state.sources.length, 1);
  assert.equal(state.sources[0], state.cached);
  assert.deepEqual(state.plays, [{ reads: 4, time: 0 }]);
});

test("a decoder failure falls back without another audio request", async () => {
  const { state, run } = fixture({ failAppend: true });
  await run();
  assert.equal(state.sources.length, 2);
  assert.equal(state.sources[1], state.cached);
  assert.deepEqual(state.plays, [{ reads: 4, time: 0 }]);
});

test("cancellation never starts playback or caches a partial reply", async () => {
  const { state, run } = fixture({ abortOnRead: true });
  await assert.rejects(run(), { name: "AbortError" });
  assert.equal(state.plays.length, 0);
  assert.equal(state.cached, null);
  assert.equal(state.released, true);
});

test("autoplay restrictions surface with a complete cached reply for Listen", async () => {
  const { state, run } = fixture({ playError: new DOMException("Blocked", "NotAllowedError") });
  await assert.rejects(run(), { name: "NotAllowedError" });
  assert.equal(state.sources.length, 1);
  assert.equal(state.cached.size, 3);
});
