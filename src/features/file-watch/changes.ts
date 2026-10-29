/** Mtimes round-trip through f64 milliseconds, so allow the same 1 ms slack as the Rust side. */
export const mtimeDiffers = (a: number, b: number) => Math.abs(a - b) >= 1;
