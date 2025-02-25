import * as tts from '../src/index';
let session: tts.TtsSession | null = null;

async function main(event: MessageEvent<tts.InferenceConfig & { type: 'init' | 'voices' | 'error' | 'stored' | 'flush' }>) {
    if (event.data.type === 'voices') {
        self.postMessage({ type: 'voices', voices: await tts.voices() })
        return;
    }

    if (event.data.type === 'stored') {
        self.postMessage({ type: 'stored', voiceIds: await tts.stored() })
        return;
    }

    if (event.data.type === 'flush') {
        await tts.flush();
        return;
    }

    if (event.data?.type != 'init') return;
    if (!session)
        session = new tts.TtsSession({
            voiceId: event.data.voiceId,
            progress: (e) => self.postMessage(JSON.stringify(e)),
            logger: (msg: string) => self.postMessage(msg),
            // If commented out will fetch from remote CDN URLs.
            wasmPaths: {
                onnxWasm: '/', //tts.TtsSession.WASM_LOCATIONS.onnxWasm,
                piperData: '/piper_phonemize.data',
                piperWasm: '/piper_phonemize.wasm',
            }
        });

    if (!!event.data.voiceId && session.voiceId !== event.data.voiceId) {
        console.log("Voice changed - reinitializing");
        session.voiceId = event.data.voiceId;
        await session.init();
    }

    session.predict(event.data.text)
        .then((res) => {
            if (res instanceof Blob) {
                self.postMessage({ type: 'result', audio: res });
                return res;
            }
        })
        .catch((error) => {
            self.postMessage({ type: 'error', message: error.message, error }) // Will be an error.
        });
}

self.addEventListener('message', main);
