export const MEMORY_SIZE = 96;
export const STACK_STARTING_ADDRESS = 80;

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

export enum MemoryRegion {
  Stack = "stack",
  Heap = "heap",
}

// ----------------------
// Data Types
// ----------------------
export type Bit = 0 | 1;

export class Byte {
  bits: Bit[];
  isPointer: boolean;

  constructor(bits?: Bit[] | number, isPointer: boolean = false) {
    this.isPointer = isPointer;

    if (typeof bits === "number") {
      this.bits = Array.from(
        { length: 8 },
        (_, i) => ((bits >> (7 - i)) & 1 ? 1 : 0) as Bit
      );
    } else {
      this.bits = Array(8).fill(0) as Bit[];
    }
  }

  get value(): number {
    return this.bits.reduce<number>(
      (acc, bit, i) => acc + Number(bit) * (1 << (7 - i)),
      0
    );
  }

  set value(n: number) {
    this.bits = Array.from(
      { length: 8 },
      (_, i) => ((n >> (7 - i)) & 1 ? 1 : 0) as Bit
    );
  }

  toString(): string {
    return this.bits.join("");
  }
}

export class Int32 {
  value: number;

  constructor(value: number = 0) {
    this.value = value | 0; // ensure 32-bit integer
  }

  toBytes(): Byte[] {
    const bytes: Byte[] = [];

    for (let i = 0; i < 4; i++) {
      bytes.push(new Byte((this.value >> (i * 8)) & 0xff));
    }

    return bytes;
  }

  static fromBytes(bytes: Byte[]): Int32 {
    if (bytes.length !== 4) {
      throw new Error("Int32 requires exactly 4 bytes");
    }

    let value = 0;

    for (let i = 0; i < 4; i++) {
      value |= bytes[i].value << (i * 8);
    }

    return new Int32(value);
  }
}

export class FixedString {
  value: string;
  length: number;

  constructor(value: string, length: number) {
    this.length = length;
    this.value = value.slice(0, length);
  }

  toBytes(): Byte[] {
    const bytes: Byte[] = [];

    for (let i = 0; i < this.length; i++) {
      const charCode = i < this.value.length ? this.value.charCodeAt(i) : 0;
      bytes.push(new Byte(charCode));
    }

    return bytes;
  }

  static fromBytes(bytes: Byte[]): FixedString {
    return new FixedString(
      bytes
        .map((b) => String.fromCharCode(b.value))
        .join("")
        .replace(/\0+$/, ""),
      bytes.length
    );
  }
}

// ----------------------
// Memory
// ----------------------
export interface Allocation {
  address: number;
  size: number;
  refCount: number; // for GC mode
  region: MemoryRegion;
}

export class Memory {
  private bytes = $state<Byte[]>([]);
  private history = $state<Byte[][]>([]);
  private historyMessages = $state<string[]>([]);
  private historyIndex = $state(-1);

  private gcEnabled = $state<boolean>(false);
  isGcEnabled = $derived(this.gcEnabled);

  private boundsChecking = $state<boolean>(false);
  isBoundsCheckingEnabled = $derived(this.boundsChecking);

  size = $derived(this.bytes.length);

  // Allocation tracking
  allocations = $state<Map<number, Allocation>>(new Map());

  allocationsArray = $derived(Array.from(this.allocations.values()));

  stackAllocations = $derived(
    this.allocationsArray.filter((a) => a.region === MemoryRegion.Stack)
  );

  heapAllocations = $derived(
    this.allocationsArray.filter((a) => a.region === MemoryRegion.Heap)
  );

  // Stack / Heap segmentation
  private stackStartAddress: number = $state(-1);
  private stackPointer: number = $state(-1);

  stackSize = $derived(this.bytes.length - this.stackStartAddress);
  usedStackSize = $derived(this.bytes.length - this.stackPointer);
  availableStackSize = $derived(this.stackPointer - this.stackStartAddress + 1);

  heapSize = $derived(this.stackStartAddress);

  usedHeapSize = $derived(
    this.heapAllocations.reduce((sum, alloc) => sum + alloc.size, 0)
  );

  availableHeapSize = $derived(this.stackStartAddress - this.usedHeapSize);

  // History
  private historyAllocations = $state<Allocation[][]>([]);
  private historyStackPointers = $state<number[]>([]);

  snapshotCount = $derived(this.history.length);
  currentSnapshot = $derived(this.historyIndex);

  currentSnapshotAllocations = $derived(
    this.getSnapshotAllocations(this.currentSnapshot)
  );

  currentSnapshotMessage = $derived(
    this.getSnapshotMessage(this.currentSnapshot)
  );

  currentSnapshotAllocatedAddresses = $derived.by(() => {
    let currentSnapshotAllocatedAddresses = Array(this.size).fill(false);

    this.currentSnapshotAllocations.forEach((allocation) => {
      const allocationStart = allocation.address;
      const allocationEnd = allocation.address + allocation.size;

      currentSnapshotAllocatedAddresses.fill(
        true,
        allocationStart,
        allocationEnd
      );
    });

    return currentSnapshotAllocatedAddresses;
  });

  constructor(
    size: number = 64,
    stackStartAddress?: number,
    enableGc: boolean = false
  ) {
    this.bytes = Array.from({ length: size }, () => new Byte(0));

    // Default: first half is heap (0 to mid-1), second half is stack (mid to end)
    // Stack starts at top of memory and grows down
    // Heap starts at bottom of memory and grows up
    this.stackStartAddress = stackStartAddress ?? Math.floor(size / 2);
    this.stackPointer = this.bytes.length - 1; // Start at top of memory

    this.gcEnabled = enableGc;

    this.takeSnapshot("Initial memory state");
  }

  // ----------------------
  // Stack / Heap info
  // ----------------------
  getMemoryRegion(address: number): MemoryRegion {
    return address < this.stackStartAddress
      ? MemoryRegion.Heap
      : MemoryRegion.Stack;
  }

  getStackStartAddress(): number {
    return this.stackStartAddress;
  }

  getStackPointer(): number {
    return this.stackPointer;
  }

  // ----------------------
  // GC mode control
  // ----------------------
  enableGc(enabled: boolean = true) {
    this.gcEnabled = enabled;
  }

  // ----------------------
  // Bounds-checking control
  // ----------------------
  /**
   * When enabled, reads/writes must occur fully inside the allocation that
   * contains the start address. This prevents overflows into adjacent allocations.
   */
  enableBoundsChecking(enabled: boolean = true) {
    this.boundsChecking = enabled;
  }

  // ----------------------
  // Stack Allocation (grows downward from top of memory)
  // ----------------------
  /**
   * Allocate memory on the stack (for demo/visualization).
   * Stack grows downward from top of memory toward heap.
   * Returns the starting address, or -1 if allocation fails.
   */
  allocateStack(size: number): number {
    if (size <= 0) {
      throw new Error("Allocation size must be positive");
    }

    if (this.stackPointer - size + 1 < this.stackStartAddress) {
      console.warn(
        `Failed to allocate ${size} bytes on stack: stack overflow (would collide with heap)`
      );
      return -1;
    }

    // Allocate by moving stack pointer down
    const address = this.stackPointer - size + 1;
    this.stackPointer = address - 1;

    this.allocations.set(address, {
      address,
      size,
      refCount: this.gcEnabled ? 1 : 0,
      region: MemoryRegion.Stack,
    });

    const desc = `allocateStack(${size}) → address ${address}, SP: ${this.stackPointer}`;
    this.takeSnapshot(desc);

    return address;
  }

  /**
   * Free stack memory (for demo/visualization).
   * In reality, stack deallocation happens automatically.
   */
  freeStack(address: number): void {
    const allocation = this.allocations.get(address);

    if (!allocation) {
      throw new Error(
        `Attempted to free unallocated memory at address ${address}`
      );
    }

    if (allocation.region !== MemoryRegion.Stack) {
      throw new Error(
        `Address ${address} is not in stack region (use free() for heap)`
      );
    }

    const isTopOfStack = address === this.stackPointer + 1;

    if (isTopOfStack) {
      this.stackPointer = address + allocation.size - 1;
    }

    // this.deallocateBlock(address, allocation.size);
    this.allocations.delete(address);

    const desc = `freeStack(${address})${
      isTopOfStack ? `, SP: ${this.stackPointer}` : " (not top of stack)"
    }`;

    this.takeSnapshot(desc);
  }

  // ----------------------
  // Heap Allocation (grows upward from bottom of memory)
  // ----------------------
  /**
   * Allocate a block of memory on the heap.
   * Heap grows upward from address 0 toward stack.
   * Returns the starting address, or -1 if allocation fails.
   */
  allocate(size: number): number {
    if (size <= 0) {
      throw new Error("Allocation size must be positive");
    }

    const address = this.findFreeBlockInHeap(size);

    if (address === -1) {
      console.warn(
        `Failed to allocate ${size} bytes on heap: out of memory (would collide with stack)`
      );
      return -1;
    }

    this.allocations.set(address, {
      address,
      size,
      refCount: this.gcEnabled ? 1 : 0,
      region: MemoryRegion.Heap,
    });

    const desc = `allocateHeap(${size}) → address ${address}`;
    this.takeSnapshot(desc);

    return address;
  }

  /**
   * Free a previously allocated block of memory.
   * In GC mode, this decrements the reference count.
   * In manual mode, this immediately frees the memory.
   */
  free(address: number): void {
    const allocation = this.allocations.get(address);

    if (!allocation) {
      throw new Error(
        `Attempted to free unallocated memory at address ${address}`
      );
    }

    if (allocation.region === MemoryRegion.Stack) {
      throw new Error(
        `Address ${address} is in stack region (use freeStack() instead)`
      );
    }

    if (this.gcEnabled) {
      allocation.refCount--;

      const collected = this.sweepIfNeeded();

      if (collected.length > 0) {
        const desc = `free(${address}) - refCount → ${
          allocation.refCount
        }, GC collected blocks: [${collected.join(", ")}]`;
        this.takeSnapshot(desc);
      } else {
        const desc = `free(${address}) - refCount → ${allocation.refCount}`;
        this.takeSnapshot(desc);
      }
    } else {
      // Manual mode: immediate deallocation
      // this.deallocateBlock(address, allocation.size);
      this.allocations.delete(address);

      const desc = `free(${address}) - memory freed`;
      this.takeSnapshot(desc);
    }
  }

  /**
   * Collect any blocks with refCount <= 0
   */
  private sweepIfNeeded(): number[] {
    const toCollect: number[] = [];

    for (const [address, allocation] of this.allocations.entries()) {
      if (allocation.refCount <= 0) {
        toCollect.push(address);
      }
    }

    for (const address of toCollect) {
      const allocation = this.allocations.get(address)!;
      // this.deallocateBlock(address, allocation.size);
      this.allocations.delete(address);
    }

    return toCollect;
  }

  /**
   * Increment reference count (GC mode only).
   * Returns true if successful, false if address not allocated.
   */
  addRef(address: number): boolean {
    if (!this.gcEnabled) {
      console.warn("addRef() called but GC is not enabled");
      return false;
    }

    const allocation = this.allocations.get(address);

    if (!allocation || allocation.region === MemoryRegion.Stack) {
      return false;
    }

    allocation.refCount++;

    const desc = `addRef(${address}) - refCount → ${allocation.refCount}`;
    this.takeSnapshot(desc);

    return true;
  }

  /**
   * Check if an address is currently allocated.
   */
  isAllocated(address: number): boolean {
    return this.allocations.has(address);
  }

  /**
   * Get allocation info for debugging.
   */
  getAllocation(address: number): Allocation | undefined {
    return this.allocations.get(address);
  }

  /**
   * Simple first-fit allocation in heap region
   */
  private findFreeBlockInHeap(size: number): number {
    const heapSize = this.stackStartAddress;

    if (size > heapSize) {
      return -1;
    }

    const heapAllocs = Array.from(this.allocations.values())
      .filter((a) => a.region === MemoryRegion.Heap)
      .sort((a, b) => a.address - b.address);

    if (heapAllocs.length === 0) {
      return 0;
    }

    if (heapAllocs[0].address >= size) {
      return 0;
    }

    for (let i = 0; i < heapAllocs.length - 1; i++) {
      const current = heapAllocs[i];
      const next = heapAllocs[i + 1];
      const gapStart = current.address + current.size;
      const gapSize = next.address - gapStart;

      if (gapSize >= size) {
        return gapStart;
      }
    }

    const last = heapAllocs[heapAllocs.length - 1];
    const remainingStart = last.address + last.size;
    const remainingSize = this.stackStartAddress - remainingStart;

    if (remainingSize >= size) {
      return remainingStart;
    }

    // No free block found
    return -1;
  }

  // /**
  //  * Zero out a block of memory (used during deallocation).
  //  */
  // private deallocateBlock(address: number, size: number): void {
  //   const newBytes = [...this.bytes];

  //   for (let i = 0; i < size; i++) {
  //     if (address + i < newBytes.length) {
  //       newBytes[address + i] = new Byte(0);
  //     }
  //   }

  //   this.bytes = newBytes;
  // }

  // ----------------------
  // Snapshot system
  // ----------------------
  private takeSnapshot(message: string = "") {
    const copy = this.bytes.map((b) => new Byte(b.value, b.isPointer));

    // If we've gone back in history and then make a new change,
    // truncate any forward history and messages (and allocation history).
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);

      this.historyMessages = this.historyMessages.slice(
        0,
        this.historyIndex + 1
      );

      // Truncate allocation history as well.
      this.historyAllocations = this.historyAllocations.slice(
        0,
        this.historyIndex + 1
      );

      this.historyStackPointers = this.historyStackPointers.slice(
        0,
        this.historyIndex + 1
      );
    }

    this.history.push(copy);
    this.historyMessages.push(message);

    const allocationsCopy: Allocation[] = Array.from(
      this.allocations.values()
    ).map((a) => ({
      address: a.address,
      size: a.size,
      refCount: a.refCount,
      region: a.region,
    }));

    this.historyAllocations.push(allocationsCopy);

    this.historyStackPointers.push(this.stackPointer);

    this.historyIndex++;
  }

  previousSnapshot() {
    if (this.historyIndex > 0) {
      this.goToSnapshot(this.historyIndex - 1);
    }
  }

  nextSnapshot() {
    if (this.historyIndex < this.history.length - 1) {
      this.goToSnapshot(this.historyIndex + 1);
    }
  }

  goToSnapshot(index: number) {
    if (index < 0 || index >= this.history.length) {
      throw new Error(`Snapshot index ${index} out of bounds`);
    }

    this.bytes = this.history[index].map((b) => new Byte(b.value, b.isPointer));
    this.historyIndex = index;

    const allocations = this.historyAllocations[index] ?? [];
    const newMap = new Map<number, Allocation>();

    for (const a of allocations) {
      newMap.set(a.address, {
        address: a.address,
        size: a.size,
        refCount: a.refCount,
        region: a.region,
      });
    }
    this.allocations = newMap;

    this.stackPointer =
      this.historyStackPointers[index] ?? this.bytes.length - 1;
  }

  getSnapshotMessage(index: number): string {
    return this.historyMessages[index] ?? "";
  }

  /**
   * Return allocations for a specific snapshot index (if available).
   */
  getSnapshotAllocations(index: number): Allocation[] {
    if (index < 0 || index >= this.historyAllocations.length) {
      throw new Error(`Snapshot index ${index} out of bounds`);
    }

    return this.historyAllocations[index].map((a) => ({ ...a }));
  }

  diffSnapshots(
    a: number,
    b: number
  ): { address: number; oldValue: number; newValue: number }[] {
    if (
      a < 0 ||
      a >= this.history.length ||
      b < 0 ||
      b >= this.history.length
    ) {
      throw new Error("Snapshot indices out of bounds");
    }

    const snapA = this.history[a];
    const snapB = this.history[b];
    const diff: { address: number; oldValue: number; newValue: number }[] = [];

    for (let i = 0; i < Math.min(snapA.length, snapB.length); i++) {
      if (snapA[i].value !== snapB[i].value) {
        diff.push({
          address: i,
          oldValue: snapA[i].value,
          newValue: snapB[i].value,
        });
      }
    }
    return diff;
  }

  // ----------------------
  // Bounds checking
  // ----------------------
  /**
   * Check that access is in-bounds for the memory array, and (when boundsChecking is enabled)
   * that the whole access range is inside a single allocation.
   */
  private checkBoundsForAccess(address: number, length: number) {
    if (address < 0 || address + length - 1 >= this.bytes.length) {
      throw new Error(
        `Address range ${address}..${address + length - 1} out of memory bounds`
      );
    }

    if (this.boundsChecking) {
      const alloc = this.findAllocationContainingRange(address, length);

      if (!alloc) {
        throw new Error(
          `Bounds-check violation: access of ${length} bytes at ${address} is not fully contained in a single allocation`
        );
      }
    }
  }

  /**
   * Find an allocation that fully contains the range [start, start + length).
   * Returns the allocation or undefined.
   */
  private findAllocationContainingRange(
    start: number,
    length: number
  ): Allocation | undefined {
    for (const a of this.allocations.values()) {
      if (start >= a.address && start + length <= a.address + a.size) {
        return a;
      }
    }

    return undefined;
  }

  // ----------------------
  // Memory access
  // ----------------------
  readByte(address: number): Byte {
    this.checkBoundsForAccess(address, 1);
    return this.bytes[address];
  }

  writeByte(address: number, value: number | Byte) {
    this.checkBoundsForAccess(address, 1);

    const newBytes = [...this.bytes];
    newBytes[address] = value instanceof Byte ? value : new Byte(value);
    this.bytes = newBytes;

    const desc = `writeByte(${address}, ${
      value instanceof Byte ? value.value : value
    })`;

    this.takeSnapshot(desc);
  }

  /**
   * Write a pointer (memory address) to the specified location.
   * Marks the byte as a pointer for visualization purposes.
   */
  writePointer(address: number, pointerValue: number) {
    this.checkBoundsForAccess(address, 1);

    const newBytes = [...this.bytes];
    newBytes[address] = new Byte(pointerValue, true);
    this.bytes = newBytes;

    const desc = `writePointer(${address}, ${pointerValue})`;
    this.takeSnapshot(desc);
  }

  writeBytes(address: number, bytes: Byte[], message: string = "") {
    if (!bytes || bytes.length === 0) {
      return;
    }

    this.checkBoundsForAccess(address, bytes.length);

    const newBytes = [...this.bytes];

    for (let i = 0; i < bytes.length; i++) {
      newBytes[address + i] = new Byte(bytes[i].value, bytes[i].isPointer);
    }

    this.bytes = newBytes;

    const byteVals = bytes.map((b) => formatHex(b.value)).join(", ");

    const desc = message || `writeBytes(${address}, [${byteVals}])`;
    this.takeSnapshot(desc);
  }

  readInt32(address: number): Int32 {
    this.checkBoundsForAccess(address, 4);
    return Int32.fromBytes(this.bytes.slice(address, address + 4));
  }

  writeInt32(address: number, value: Int32) {
    this.checkBoundsForAccess(address, 4);

    const desc = `writeInt32(${address}, new Int32(${value.value}))`;
    this.writeBytes(address, value.toBytes(), desc);
  }

  readString(address: number, length: number): FixedString {
    this.checkBoundsForAccess(address, length);
    return FixedString.fromBytes(this.bytes.slice(address, address + length));
  }

  writeString(address: number, value: FixedString) {
    this.checkBoundsForAccess(address, value.length);

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
    this.history = [];
    this.historyMessages = [];
    this.historyAllocations = [];
    this.historyStackPointers = [];
    this.historyIndex = -1;

    this.takeSnapshot("Memory reset");
  }

  dump(): string {
    return this.bytes
      .map((b) => b.value.toString(16).padStart(2, "0"))
      .join(" ");
  }
}
