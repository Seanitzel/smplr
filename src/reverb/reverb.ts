import { PROCESSOR } from "./processor.min";
import { type AudioContext, AudioWorkletNode, IAudioDestinationNode, IAudioParam } from "standardized-audio-context";

const PARAMS = [
  "preDelay",
  "bandwidth",
  "inputDiffusion1",
  "inputDiffusion2",
  "decay",
  "decayDiffusion1",
  "decayDiffusion2",
  "damping",
  "excursionRate",
  "excursionDepth",
  "wet",
  "dry",
] as const;

const init = new WeakMap<AudioContext, Promise<void>>();

async function createDattorroReverbEffect(context: AudioContext) {
  let ready = init.get(context);
  if (!ready) {
    const blob = new Blob([PROCESSOR], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    ready = context.audioWorklet?.addModule(url) ?? Promise.reject();
    init.set(context, ready);
  }
  await ready;

  if (!AudioWorkletNode) return Promise.reject();
  const reverb = new AudioWorkletNode(context, "DattorroReverb", {
    outputChannelCount: [2],
  }) ?? Promise.reject();
  return reverb;
}

export class Reverb {
  #effect: AudioWorkletNode<AudioContext> | undefined;
  #ready: Promise<this>;
  public readonly input: AudioNode;
  #output: IAudioDestinationNode<AudioContext> | AudioNode;

  constructor(context: AudioContext) {
    this.input = context.createGain() as unknown as AudioNode;
    this.#output = context.destination;
    this.#ready = createDattorroReverbEffect(context).then((reverb) => {
      this.input.connect(reverb as unknown as AudioNode);
      reverb.connect(this.#output as any);
      this.#effect = reverb;
      return this;
    });
  }

  get paramNames() {
    return PARAMS;
  }

  getParam(name: (typeof PARAMS)[number]): IAudioParam | undefined {
    return this.#effect?.parameters.get("preDelay");
  }

  get isReady(): boolean {
    return this.#effect !== undefined;
  }

  ready(): Promise<this> {
    return this.#ready;
  }

  connect(output: AudioNode) {
    if (this.#effect) {
      this.#effect.disconnect(this.#output as any);
      this.#effect.connect(output as any);
    }
    this.#output = output;
  }
}
