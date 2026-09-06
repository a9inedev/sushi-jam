/* DOM-free entry for the audio builders: used by tests and the WAV export tool. */
export { renderPatch, toWav, type Patch, type Layer, type Rendered } from './synth';
export { SOUNDS, PATCHES, INSTRUMENTS, INSTRUMENT_PATCH, BUS_OF, type SfxName, type InstrumentName } from './patches';
export { buildLoop, midiToRate, BPM, BEAT, LOOP_BARS, LOOP_SECONDS, PENTATONIC, type NoteEvent } from './music';
