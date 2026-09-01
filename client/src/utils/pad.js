export function pad(x, length, padding) {
    const excess = Array(length).fill(padding);
    let newX = [...x, ...excess];
    return newX.slice(0, length);
}