export class RingBuffer<T> {
  private buffer: (T | undefined)[];
  private head: number = 0;
  private size: number = 0;
  private cap: number;

  constructor(capacity: number) {
    this.cap = capacity;
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    const index = (this.head + this.size) % this.cap;
    if (this.size < this.cap) {
      this.size++;
    } else {
      this.head = (this.head + 1) % this.cap;
    }
    this.buffer[index] = item;
  }

  clear(): void {
    this.head = 0;
    this.size = 0;
  }

  toArray(): T[] {
    if (this.size === 0) return [];

    const endIndex = this.head + this.size;
    if (endIndex <= this.cap) {
      return this.buffer.slice(this.head, endIndex) as T[];
    }

    const result = new Array<T>(this.size);
    for (let i = 0; i < this.size; i++) {
      result[i] = this.buffer[(this.head + i) % this.cap] as T;
    }
    return result;
  }

  takeLast(count: number): T[] {
    const n = Math.min(count, this.size);
    if (n === 0) return [];

    const startOffset = this.size - n;
    const startIndex = (this.head + startOffset) % this.cap;
    const endIndex = (this.head + this.size) % this.cap;

    if (startIndex < endIndex) {
      return this.buffer.slice(startIndex, endIndex) as T[];
    }

    const result = new Array<T>(n);
    for (let i = 0; i < n; i++) {
      result[i] = this.buffer[(startIndex + i) % this.cap] as T;
    }
    return result;
  }

  get length(): number {
    return this.size;
  }
}
