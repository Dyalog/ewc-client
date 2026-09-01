export default function(obj, evName) {
  const events = obj?.Properties?.Event;
  if (!events) return false;
  for (let ev of events) {
    if (ev[0] === evName) return true;
  }
  return false;
}