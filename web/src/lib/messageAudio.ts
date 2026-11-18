const AUDIO_TYPE = "audio/mpeg";
const START_BUFFER_SECONDS = 0.75;

function waitForEvent(
  target: EventTarget,
  event: string,
  signal: AbortSignal,
  start: () => void,
) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      target.removeEventListener(event, onReady);
      target.removeEventListener("error", onError);
      signal.removeEventListener("abort", onAbort);
    };
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Audio buffering failed"));
    };
    const onAbort = () => {
      cleanup();
      reject(signal.reason);
    };
    const timeout = setTimeout(onError, 10_000);
    target.addEventListener(event, onReady, { once: true });
    target.addEventListener("error", onError, { once: true });
    signal.addEventListener("abort", onAbort, { once: true });
    try {
      signal.throwIfAborted();
      start();
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

// Keep downloading even if progressive decoding fails, so fallback and replay
// use the same complete MP3 without making another TTS request.
export async function playAudioResponse(
  response: Response,
  audio: HTMLAudioElement,
  signal: AbortSignal,
  setSource: (source: Blob | MediaSource) => void,
  onComplete: (blob: Blob) => void,
) {
  if (!response.body) throw new Error("Audio response has no body");

  let mediaSource: MediaSource | undefined;
  let sourceBuffer: SourceBuffer | undefined;
  let streamFailed = false;
  let playback: Promise<void> | undefined;
  let playbackError: unknown;
  const onError = () => {
    streamFailed = true;
    audio.pause();
  };
  audio.addEventListener("error", onError);

  const startPlayback = () => {
    if (playback || !sourceBuffer?.buffered.length) return;
    // Explicitly preserve the beginning rather than starting at a live edge.
    audio.currentTime = sourceBuffer.buffered.start(0);
    playback = audio.play().catch((error: unknown) => {
      playbackError = error;
      streamFailed = true;
    });
  };

  const reader = response.body.getReader();
  const chunks: ArrayBuffer[] = [];
  try {
    if (typeof MediaSource !== "undefined" && MediaSource.isTypeSupported(AUDIO_TYPE)) {
      try {
        const source = new MediaSource();
        mediaSource = source;
        await waitForEvent(source, "sourceopen", signal, () => setSource(source));
        // This is a finite reply, not a live stream. Appends extend its duration.
        mediaSource.duration = 0;
        sourceBuffer = mediaSource.addSourceBuffer(AUDIO_TYPE);
      } catch (error) {
        signal.throwIfAborted();
        console.warn("Progressive audio unavailable; buffering full reply", error);
        streamFailed = true;
      }
    }

    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      if (!value.byteLength) continue;
      const copy = value.slice();
      chunks.push(copy.buffer);

      if (sourceBuffer && !streamFailed) {
        try {
          const buffer = sourceBuffer;
          await waitForEvent(buffer, "updateend", signal, () => buffer.appendBuffer(copy));
          if (
            buffer.buffered.length &&
            buffer.buffered.end(0) - buffer.buffered.start(0) >= START_BUFFER_SECONDS
          ) {
            // Do not await play here: some browsers need subsequent appends
            // before they can resolve the playback promise.
            startPlayback();
          }
        } catch (error) {
          signal.throwIfAborted();
          console.warn("Progressive audio failed; buffering full reply", error);
          streamFailed = true;
          audio.pause();
        }
      }
    }

    const blob = new Blob(chunks, { type: AUDIO_TYPE });
    if (!blob.size) throw new Error("Audio response was empty");
    onComplete(blob);

    if (sourceBuffer && !streamFailed && mediaSource?.readyState === "open") {
      try {
        mediaSource.endOfStream();
        startPlayback(); // Short replies may never reach the startup threshold.
        if (!playback) throw new Error("No playable audio was buffered");
        await playback;
      } catch (error) {
        signal.throwIfAborted();
        playbackError = error;
        streamFailed = true;
      }
    } else if (sourceBuffer) {
      streamFailed = true;
    }

    signal.throwIfAborted();
    // A user-gesture restriction also applies to full-file playback.
    if (playbackError instanceof DOMException && playbackError.name === "NotAllowedError") {
      throw playbackError;
    }
    if (!sourceBuffer || streamFailed) {
      audio.pause();
      audio.removeEventListener("error", onError);
      setSource(blob);
      await audio.play();
    }
  } finally {
    audio.removeEventListener("error", onError);
    reader.releaseLock();
  }
}
