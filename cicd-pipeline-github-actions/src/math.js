// Small pure functions, deliberately dependency-free so unit tests run fast.
function add(a, b) { return a + b; }
function average(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) throw new Error("average needs a non-empty array");
  return numbers.reduce((s, n) => s + n, 0) / numbers.length;
}
function formatUptime(seconds) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h + "h " + m + "m " + sec + "s";
}
module.exports = { add, average, formatUptime };
