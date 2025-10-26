export const MEMORY_SIZE = 96;
export const STACK_STARTING_ADDRESS = 80;

export const BYTE_SIZE = 8;
export const FIXED_STRING_SIZE = 16;
export const INT32_SIZE = 4;
export const INT32_MAX = 2147483647;

export function formatHex(value: number | BigInt): string {
  return "0x" + value.toString(16).padStart(2, "0").toUpperCase();
}

export function formatHexDisplay(value: number | BigInt): string {
  return `${formatHex(value)} (${value})`;
}

export function formatBinary(value: number | BigInt): string {
  return "0b" + value.toString(2).padStart(8, "0");
}

export function getAddressRangeDisplay(
  baseAddress: number,
  offset: number,
  size: number,
  isStack: boolean = true
): string {
  const start = baseAddress + offset;

  let end;

  if (isStack) {
    end = start - size + 1;
  } else {
    end = start + size - 1;
  }

  let display;

  if (start === end) {
    display = `${start}`;
  } else {
    display = `${start} - ${end}`;
  }

  return display;
}

export enum DisplayType {
  Hex = "hex",
  Int = "int",
  String = "string",
}

// -------------
// Data Types
// -------------
export type Bit = 0 | 1;

// Converts a number (e.g., 5) into [0,0,0,0,0,1,0,1]
// Uses string manipulation instead of bit shifting for readability
export function numberToBitArray(n: number): Bit[] {
  // Handle overflow/negative numbers (force 8-bit unsigned)
  // Bit mask and with only 8 bits turned on
  const byteValue = n & 0xff;

  // Convert to binary string (e.g. "101")
  const binaryString = byteValue.toString(2);

  // Pad with leading zeros to ensure length of 8 (e.g. "00000101")
  const paddedString = binaryString.padStart(BYTE_SIZE, "0");

  // Split into array and convert strings back to numbers
  return paddedString.split("").map((char) => parseInt(char) as Bit);
}

export class Byte {
  bits: Bit[];
  isPointer: boolean;

  constructor(data?: Bit[] | number, isPointer: boolean = false) {
    this.isPointer = isPointer;

    if (typeof data === "number") {
      this.bits = numberToBitArray(data);
    } else if (Array.isArray(data)) {
      this.bits = data.slice(0, BYTE_SIZE);
    } else {
      // Default to zeros if nothing is passed
      this.bits = Array(BYTE_SIZE).fill(0);
    }
  }

  get value(): number {
    const binaryString = this.bits.join("");
    return parseInt(binaryString, 2);
  }

  set value(n: number) {
    this.bits = numberToBitArray(n);
  }

  toString(): string {
    return this.bits.join("");
  }
}

export class Int32 {
  value: number;

  constructor(value: number = 0) {
    // When you apply a bitwise operator (like |, &, ^) to a JavaScript number,
    // the engine momentarily converts that complicated float into
    // a raw 32-bit integer to do the math.
    this.value = value | 0; // Force 32-bit integer
  }

  toBytes(): Byte[] {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
    const buffer = new ArrayBuffer(4);

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView
    const view = new DataView(buffer);
    view.setInt32(0, this.value, true);

    const uint8Array = new Uint8Array(buffer);

    return Array.from(uint8Array).map((num) => new Byte(num));
  }

  static fromBytes(bytes: Byte[]): Int32 {
    if (bytes.length !== 4) {
      throw new Error("Int32 requires exactly 4 bytes");
    }

    const rawNumbers = bytes.map((b) => b.value);
    const buffer = new Uint8Array(rawNumbers).buffer;
    const view = new DataView(buffer);

    return new Int32(view.getInt32(0, true));
  }
}

export class FixedString {
  value: string;
  length: number;

  constructor(value: string, length: number) {
    this.length = length;
    // Ensure string is not longer than the limit
    this.value = value.slice(0, length);
  }

  toBytes(): Byte[] {
    const charCodes = this.value.split("").map((char) => char.charCodeAt(0));

    const paddingNeeded = this.length - charCodes.length;
    const padding = Array(paddingNeeded).fill(0);

    return [...charCodes, ...padding].map((code) => new Byte(code));
  }

  static fromBytes(bytes: Byte[]): FixedString {
    const fullString = bytes.map((b) => String.fromCharCode(b.value)).join("");

    // Remove trailing Null bytes
    // This regex finds one or more (\+) Null chars (\0) at the end ($)
    const cleanString = fullString.replace(/\0+$/, "");

    return new FixedString(cleanString, bytes.length);
  }
}

export enum MemoryRegion {
  Stack = "stack",
  Heap = "heap",
}

interface Allocation {
  address: number;
  size: number;
  refCount: number;
  region: MemoryRegion;
}

interface Snapshot {
  bytes: Byte[];
  allocations: Allocation[];
  stackPointer: number;
  message: string;
  timestamp: number;
}

interface MemoryDiff {
  address: number;
  oldValue: number;
  newValue: number;
}

export class Memory {
  private bytes = $state<Byte[]>([]);

  // Maps address -> Allocation Metadata
  allocations = $state<Map<number, Allocation>>(new Map());

  // Configuration
  private gcEnabled = $state<boolean>(false);
  isGcEnabled = $derived(this.gcEnabled);

  // When enabled, reads/writes must occur fully inside the allocation that
  // contains the start address. This prevents overflows into adjacent allocations.
  private boundsChecking = $state<boolean>(false);
  isBoundsCheckingEnabled = $derived(this.boundsChecking);

  // Stack / Heap Pointers
  private stackStartAddress: number = $state(-1);
  private stackPointer: number = $state(-1);

  // History / Time Travel State
  private snapshots = $state<Snapshot[]>([]);
  private historyIndex = $state(-1);

  // Metrics
  size = $derived(this.bytes.length);
  allocationsArray = $derived(Array.from(this.allocations.values()));

  stackAllocations = $derived(
    this.allocationsArray.filter((a) => a.region === MemoryRegion.Stack)
  );

  heapAllocations = $derived(
    this.allocationsArray.filter((a) => a.region === MemoryRegion.Heap)
  );

  // Calculations
  stackSize = $derived(this.size - this.stackStartAddress);
  stackBoundary = $derived(this.stackPointer + 1);
  usedStackSize = $derived(this.size - this.stackPointer); // Stack grows down
  availableStackSize = $derived(this.stackPointer - this.stackStartAddress + 1);

  heapSize = $derived(this.stackStartAddress);
  usedHeapSize = $derived(
    this.heapAllocations.reduce((sum, alloc) => sum + alloc.size, 0)
  );
  availableHeapSize = $derived(this.stackStartAddress - this.usedHeapSize);
  sortedHeapAllocations = $derived(
    this.heapAllocations.sort((a, b) => a.address - b.address)
  );

  heapEmpty = $derived(this.sortedHeapAllocations.length === 0);

  // History
  snapshotCount = $derived(this.snapshots.length);
  currentSnapshot = $derived(this.historyIndex);

  // Helpers
  currentSnapshotAllocations = $derived(
    this.snapshots[this.historyIndex]?.allocations ?? []
  );

  currentSnapshotMessage = $derived(
    this.snapshots[this.historyIndex]?.message ?? ""
  );

  // Visualization helper: Returns a boolean mask of used bytes
  currentSnapshotAllocatedAddresses = $derived.by(() => {
    const mask = new Array(this.size).fill(false);
    for (const alloc of this.currentSnapshotAllocations) {
      mask.fill(true, alloc.address, alloc.address + alloc.size);
    }
    return mask;
  });

  constructor(
    size: number = 64,
    stackStartAddress?: number,
    enableGc: boolean = false
  ) {
    // Initialize zeroed memory
    this.bytes = Array.from({ length: size }, () => new Byte(0));

    // Default: Split memory 50/50 if no start address provided
    this.stackStartAddress = stackStartAddress ?? Math.floor(size / 2);

    // Stack starts at the very end (High Address)
    this.stackPointer = this.bytes.length - 1;

    this.gcEnabled = enableGc;

    this.takeSnapshot("Initial memory state");
  }

  // =======
  // Config
  // =======
  enableGc(enabled: boolean = true) {
    this.gcEnabled = enabled;
  }

  enableBoundsChecking(enabled: boolean = true) {
    this.boundsChecking = enabled;
  }

  // =======
  // Stack
  // =======
  allocateStack(size: number): number {
    if (size <= 0) {
      throw new Error("Allocation size must be positive");
    }

    const candidateAddress = this.calculateStackAddress(size);

    if (candidateAddress < this.stackStartAddress) {
      console.warn(`Stack Overflow: Cannot allocate ${size} bytes.`);
      return -1;
    }

    this.stackPointer = candidateAddress - 1;

    this.allocations.set(candidateAddress, {
      address: candidateAddress,
      size,
      refCount: this.gcEnabled ? 1 : 0,
      region: MemoryRegion.Stack,
    });

    this.takeSnapshot(`allocateStack(${size}) → address ${candidateAddress}`);

    return candidateAddress;
  }

  freeStack(address: number): void {
    const allocation = this.retrieveValidAllocation(
      address,
      MemoryRegion.Stack
    );

    const isTopOfStack = address === this.stackBoundary;

    if (isTopOfStack) {
      // If we remove the bottom-most block, the pointer moves UP
      this.stackPointer = address + allocation.size - 1;
    }

    this.allocations.delete(address);

    this.takeSnapshot(`freeStack(${address})`);
  }

  private calculateStackAddress(size: number): number {
    // (Current lowest index) - (Size of new block) + 1
    return this.stackPointer - size + 1;
  }

  // =====
  // Heap
  // =====
  allocate(size: number): number {
    if (size <= 0) {
      throw new Error("Allocation size must be positive");
    }

    const address = this.findFreeBlockInHeap(size);

    if (address === -1) {
      console.warn(`Heap Out of Memory: Cannot allocate ${size} bytes.`);
      return -1;
    }

    this.allocations.set(address, {
      address,
      size,
      refCount: this.gcEnabled ? 1 : 0,
      region: MemoryRegion.Heap,
    });

    this.takeSnapshot(`allocateHeap(${size}) → address ${address}`);

    return address;
  }

  free(address: number): void {
    const allocation = this.retrieveValidAllocation(address, MemoryRegion.Heap);

    if (this.gcEnabled) {
      allocation.refCount--;

      const collected = this.sweepGarbage();

      const details = collected.length
        ? `(GC collected: ${collected.join(", ")})`
        : `(refCount: ${allocation.refCount})`;

      this.takeSnapshot(`free(${address}) ${details}`);
    } else {
      this.allocations.delete(address);

      this.takeSnapshot(`free(${address}) - Manual free`);
    }
  }

  private findFreeBlockInHeap(size: number): number {
    const heapLimit = this.stackStartAddress;

    if (size > heapLimit) {
      return -1;
    }

    const sorted = Array.from(this.allocations.values())
      .filter((a) => a.region === MemoryRegion.Heap)
      .sort((a, b) => a.address - b.address);

    // Heap is empty
    if (sorted.length === 0) {
      return 0;
    }

    // Gap at the very start (Address 0)
    if (sorted[0].address >= size) {
      return 0;
    }

    // Gap between allocations
    for (let i = 0; i < sorted.length - 1; i++) {
      const currentEnd = sorted[i].address + sorted[i].size;
      const nextStart = sorted[i + 1].address;

      if (nextStart - currentEnd >= size) {
        return currentEnd;
      }
    }

    // Space after the last allocation
    const lastAlloc = sorted[sorted.length - 1];
    const lastAllocEnd = lastAlloc.address + lastAlloc.size;

    if (heapLimit - lastAllocEnd >= size) {
      return lastAllocEnd;
    }

    return -1;
  }

  // Helper for validation
  private retrieveValidAllocation(
    address: number,
    expectedRegion: MemoryRegion
  ): Allocation {
    const allocation = this.allocations.get(address);

    if (!allocation) {
      throw new Error(`No allocation at ${address}`);
    }

    if (allocation.region !== expectedRegion) {
      throw new Error(`Region mismatch: Expected ${expectedRegion}`);
    }

    return allocation;
  }

  // ======
  // GC
  // ======
  addRef(address: number): boolean {
    if (!this.gcEnabled) {
      return false;
    }

    const allocation = this.allocations.get(address);

    if (!allocation || allocation.region === MemoryRegion.Stack) {
      return false;
    }

    allocation.refCount++;

    this.takeSnapshot(`addRef(${address}) → ${allocation.refCount}`);
    return true;
  }

  private sweepGarbage(): number[] {
    const collected: number[] = [];

    for (const [addr, alloc] of this.allocations.entries()) {
      if (alloc.refCount <= 0) {
        collected.push(addr);
        this.allocations.delete(addr);
      }
    }

    return collected;
  }

  // ============
  //  History
  // ============
  private takeSnapshot(message: string) {
    // Truncate future history if we went back in time
    if (this.historyIndex < this.snapshots.length - 1) {
      this.snapshots = this.snapshots.slice(0, this.historyIndex + 1);
    }

    //  Deep Copy of State
    const snapshot: Snapshot = {
      bytes: this.bytes.map((b) => new Byte(b.value, b.isPointer)),
      // Shallow copy of objects is fine here as we replace objects on update
      allocations: Array.from(this.allocations.values()).map((a) => ({ ...a })),
      stackPointer: this.stackPointer,
      message,
      timestamp: Date.now(),
    };

    this.snapshots.push(snapshot);
    this.historyIndex++;
  }

  goToSnapshot(index: number) {
    if (index < 0 || index >= this.snapshots.length) {
      throw new Error(`Snapshot ${index} out of bounds`);
    }

    const snapshot = this.snapshots[index];

    this.bytes = snapshot.bytes.map((b) => new Byte(b.value, b.isPointer));
    this.stackPointer = snapshot.stackPointer;
    this.historyIndex = index;

    // Rebuild Map
    this.allocations = new Map(
      snapshot.allocations.map((a) => [a.address, { ...a }])
    );
  }

  previousSnapshot() {
    this.goToSnapshot(Math.max(0, this.historyIndex - 1));
  }
  nextSnapshot() {
    this.goToSnapshot(
      Math.min(this.snapshots.length - 1, this.historyIndex + 1)
    );
  }

  getSnapshotMessage(index: number): string {
    return this.snapshots[index]?.message ?? "";
  }

  getSnapshotAllocations(index: number): Allocation[] {
    return this.snapshots[index]?.allocations.map((a) => ({ ...a })) ?? [];
  }

  diffSnapshots(aIndex: number, bIndex: number): MemoryDiff[] {
    if (!this.snapshots[aIndex] || !this.snapshots[bIndex]) {
      throw new Error(`Invalid snapshot indices: ${aIndex}, ${bIndex}`);
    }

    const bytesA = this.snapshots[aIndex].bytes;
    const bytesB = this.snapshots[bIndex].bytes;
    const length = Math.min(bytesA.length, bytesB.length);

    const diffs: MemoryDiff[] = [];

    for (let i = 0; i < length; i++) {
      if (bytesA[i].value !== bytesB[i].value) {
        diffs.push({
          address: i,
          oldValue: bytesA[i].value,
          newValue: bytesB[i].value,
        });
      }
    }

    return diffs;
  }

  // ==============
  // Read / Write
  // ==============
  readByte(address: number): Byte {
    this.validateAccess(address, 1);
    return this.bytes[address];
  }

  writeByte(address: number, value: number | Byte) {
    this.validateAccess(address, 1);
    this.bytes[address] = value instanceof Byte ? value : new Byte(value);
    this.takeSnapshot(`writeByte(${address}, ${value})`);
  }

  writePointer(address: number, pointerVal: number) {
    this.validateAccess(address, 1);
    this.bytes[address] = new Byte(pointerVal, true);
    this.takeSnapshot(`writePointer(${address}, ${pointerVal})`);
  }

  private validateAccess(address: number, length: number) {
    if (address < 0 || address + length > this.size) {
      throw new Error(`Out of bounds: ${address}..${address + length}`);
    }

    if (this.boundsChecking) {
      const hasContainer = Array.from(this.allocations.values()).some(
        (a) => address >= a.address && address + length <= a.address + a.size
      );

      if (!hasContainer) {
        throw new Error(`Bounds Violation at ${address}`);
      }
    }
  }

  // Helpers
  writeBytes(address: number, data: Byte[], message?: string) {
    if (!data.length) {
      return;
    }

    this.validateAccess(address, data.length);

    const newBytes = [...this.bytes];

    for (let i = 0; i < data.length; i++) {
      newBytes[address + i] = new Byte(data[i].value, data[i].isPointer);
    }

    this.bytes = newBytes;

    this.takeSnapshot(message || `writeBytes(${address}, len=${data.length})`);
  }

  readInt32(address: number): Int32 {
    this.validateAccess(address, 4);
    return Int32.fromBytes(this.bytes.slice(address, address + 4));
  }

  writeInt32(address: number, value: Int32) {
    this.validateAccess(address, 4);
    const desc = `writeInt32(${address}, new Int32(${value.value}))`;
    this.writeBytes(address, value.toBytes(), desc);
  }

  readString(address: number, length: number): FixedString {
    this.validateAccess(address, length);
    return FixedString.fromBytes(this.bytes.slice(address, address + length));
  }

  writeString(address: number, value: FixedString) {
    this.validateAccess(address, value.length);
    const desc = `writeString(${address}, new FixedString("${value.value}", ${value.length}))`;
    this.writeBytes(address, value.toBytes(), desc);
  }

  clearMemory(message: string = "clearMemory()") {
    const newBytes = Array.from(
      { length: this.bytes.length },
      () => new Byte(0)
    );

    this.bytes = newBytes;
    this.allocations.clear();
    this.stackPointer = this.bytes.length - 1;
    this.takeSnapshot(message);
  }

  resetMemory() {
    this.bytes = Array.from({ length: this.bytes.length }, () => new Byte(0));
    this.allocations.clear();
    this.stackPointer = this.bytes.length - 1;
    this.snapshots = [];
    this.historyIndex = -1;
    this.takeSnapshot("Memory reset");
  }

  // Helper for dumping
  dump(): string {
    return this.bytes
      .map((b) => b.value.toString(16).padStart(2, "0"))
      .join(" ");
  }
}
