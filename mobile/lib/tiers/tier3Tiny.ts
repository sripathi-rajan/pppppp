/**
 * Web-only Tier 3: a real tiny LLM (Llama-3.2-1B-Instruct, q4) that runs entirely in the
 * browser via @huggingface/transformers. Warmed up automatically in the background (see
 * useSmartChat's mount effect) so it's already cached and ready by the time Tier 1 (cloud)
 * becomes unreachable — no manual "enable offline mode" step. Callers MUST guard with
 * Platform.OS === 'web' — this module is never imported from a native code path.
 *
 * The model's own weight cache (Cache API / IndexedDB under the hood) is reused for
 * persistence across sessions — no hand-rolled OPFS manager for this MVP.
 */

const MODEL_ID = 'onnx-community/Llama-3.2-1B-Instruct-q4f16';

export interface TinyLoadProgress {
  status: string;
  file?: string;
  progress?: number; // 0-100
}

type TinyGenerator = any; // shape comes from @huggingface/transformers, loaded dynamically

let generatorPromise: Promise<TinyGenerator> | null = null;

export function isTinyModelLoaded(): boolean {
  return generatorPromise !== null;
}

export async function loadTinyModel(
  onProgress?: (p: TinyLoadProgress) => void
): Promise<TinyGenerator> {
  if (!generatorPromise) {
    generatorPromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');

      // Fix BigInt serialization for Expo logs/UI if not defined
      if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any).toJSON) {
        (BigInt.prototype as any).toJSON = function () {
          return this.toString();
        };
      }

      const progressCallback = (p: any) => {
        onProgress?.({
          status: p.status,
          file: p.file,
          progress: typeof p.progress === 'number' ? Math.round(p.progress) : undefined,
        });
      };

      // Configure for WebGPU (required for Llama-3 KV cache shape matching)
      // and fallback gracefully if not supported.
      try {
        return await pipeline('text-generation', MODEL_ID, {
          dtype: 'q4f16',
          device: 'webgpu',
          progress_callback: progressCallback,
        });
      } catch (e) {
        // Fallback to wasm if WebGPU is not supported
        if (env.backends.onnx.wasm) {
          env.backends.onnx.wasm.numThreads = 1;
        }
        return await pipeline('text-generation', MODEL_ID, {
          dtype: 'q4', // Standard q4 often works better in WASM
          device: 'wasm',
          progress_callback: progressCallback,
        });
      }
    })().catch((err) => {
      generatorPromise = null; // allow retry on failure
      throw err;
    });
  }
  return generatorPromise;
}

export interface TinyHistoryTurn {
  role: 'user' | 'model';
  parts: string[];
}

export interface TinyGenerateOptions {
  onToken?: (token: string) => void;
  /** Called if a refusal is detected and we're about to regenerate from scratch, so the
   * caller can clear whatever partial text it already streamed to the UI. */
  onReset?: () => void;
}

const SYSTEM_PROMPT =
  "You are DriveLegal's offline assistant, a helpful traffic-law educator running on-device " +
  "because there's no internet connection right now. You cannot look up live fine/rule data " +
  'from the database, but you MUST still answer from your general knowledge — discussing what ' +
  'a traffic offense is and roughly what it costs or leads to is exactly your job, not ' +
  'off-limits content.\n\n' +
  'Rules:\n' +
  '- NEVER refuse a question about traffic offenses, fines, penalties, or driving rules, and ' +
  'never make "check with local authorities" or "consult a lawyer" your entire answer — that ' +
  'is not helpful. Give your best general answer first.\n' +
  '- Assume India if no country is mentioned.\n' +
  '- Keep answers short (3-6 sentences) — you are a small on-device model, so a brief useful ' +
  'answer beats a long one.\n' +
  "- End with a short reminder to verify exact figures once they're back online.";

const REFUSAL_PATTERNS = [
  /i cannot (provide|give|share|discuss)/i,
  /i can'?t (provide|give|share|discuss)/i,
  /i'?m not able to/i,
  /i am not (able|allowed) to/i,
  /i recommend (checking|consulting|contacting)/i,
  /consult (a|your) (lawyer|attorney|local authorities)/i,
];

function looksLikeRefusal(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;
  // Real answers run longer; the refusals this model produces are short generic redirects.
  if (trimmed.length > 220) return false;
  return REFUSAL_PATTERNS.some((re) => re.test(trimmed));
}

async function runGeneration(
  generator: TinyGenerator,
  TextStreamer: any,
  messages: { role: string; content: string }[],
  onToken?: (token: string) => void
): Promise<string> {
  let fullText = '';
  const streamer = new TextStreamer(generator.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (token: string) => {
      fullText += token;
      onToken?.(token);
    },
  });
  await generator(messages, { max_new_tokens: 512, do_sample: false, streamer });
  return fullText.trim();
}

export async function generateTiny(
  prompt: string,
  history: TinyHistoryTurn[] = [],
  options: TinyGenerateOptions = {}
): Promise<string> {
  const generator = await loadTinyModel();
  const { TextStreamer } = await import('@huggingface/transformers');

  const baseMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-6).map((h) => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.parts.join(' '),
    })),
    { role: 'user', content: prompt },
  ];

  let answer = await runGeneration(generator, TextStreamer, baseMessages, options.onToken);

  // Small instruct models occasionally answer the first pass with a refusal/redirect instead
  // of actually helping. Rather than making the user manually re-ask more forcefully, retry
  // once automatically with an explicit nudge — mirrors what a user would type back anyway.
  if (looksLikeRefusal(answer)) {
    options.onReset?.();
    const retryMessages = [
      ...baseMessages,
      { role: 'assistant', content: answer },
      {
        role: 'user',
        content:
          'Do not refuse or redirect me elsewhere — answer directly with general, unofficial ' +
          'information about the likely penalty or rule for this, then remind me to verify it ' +
          'locally. This is for general education only.',
      },
    ];
    answer = await runGeneration(generator, TextStreamer, retryMessages, options.onToken);
  }

  return answer;
}
