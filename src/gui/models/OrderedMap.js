export class OrderedMap {
  constructor(entries = []) {
    this.map = new Map();          // key -> value
    this.keys = [];                // index -> key
    this.indexByKey = new Map();   // key -> index

    for (const [k, v] of entries) this.set(k, v);
  }

  get length() {
    return this.keys.length;
  }

  has(key) {
    return this.map.has(key);
  }

  get(key) {
    return this.map.get(key);
  }

  set(key, value) {
    if (!this.map.has(key)) {
      this.indexByKey.set(key, this.keys.length);
      this.keys.push(key);
    }
    this.map.set(key, value);
    return this;
  }

  delete(key) {
    if (!this.map.has(key)) return false;

    const idx = this.indexByKey.get(key);
    this.map.delete(key);
    this.indexByKey.delete(key);

    // remove from keys array
    this.keys.splice(idx, 1);

    // fix indexes for keys after the removed index
    for (let i = idx; i < this.keys.length; i++) {
      this.indexByKey.set(this.keys[i], i);
    }
    return true;
  }

  // Index-based access
  keyAt(i) {
    return this.keys[i];
  }

  at(i) {
    const key = this.keys[i];
    if (key === undefined) return undefined;
    return this.map.get(key);
    // return [key, this.map.get(key)];
  }

  prevIndex(i) {
    return i > 0 ? i - 1 : -1;
  }

  nextIndex(i) {
    return i < this.keys.length - 1 ? i + 1 : -1;
  }

  prev(i) {
    return this.at(this.prevIndex(i));
  }

  next(i) {
    return this.at(this.nextIndex(i));
  }

  get first() {
    return this.at(0);
  }

  get last() {
    return this.at(this.keys.length - 1);
  }

  indexOf(key) {
    return this.indexByKey.get(key) ?? -1;
  }

  // Iterate in order
  *entries() {
    for (const key of this.keys) yield [key, this.map.get(key)];
  }

  *keys() {
    yield* this.keys;
  }

  *values() {
    for (const key of this.keys) {
      yield this.map.get(key);
    }
  }
}
