<script lang="ts">
  import {
    Memory,
    MEMORY_SIZE,
    STACK_STARTING_ADDRESS,
  } from "../../memory.svelte";
  import Row from "./Row.svelte";

  let { memory, title = "" }: { memory: Memory; title?: string } = $props();

  const bytesPerRow = 8;

  const heapStartingRowIndex =
    (MEMORY_SIZE - STACK_STARTING_ADDRESS) / bytesPerRow;

  const baseTitle = "Memory Layout";
  let displayTitle = $derived(title ? `${baseTitle}: ${title}` : baseTitle);

  let expandedBytes = $state(Array(memory.size).fill(false));
  let anyBytesExpanded = $derived(expandedBytes.some((value) => value));

  let reversedRows = $derived(
    Array.from({ length: Math.ceil(memory.size / bytesPerRow) }, (_, i) => {
      const end = memory.size - i * bytesPerRow;
      const start = Math.max(end - bytesPerRow, 0);

      return {
        startAddress: start,
        bytes: Array.from({ length: end - start }, (_, j) => ({
          address: start + j,
          byte: memory.readByte(start + j),
        })).reverse(), // Reverse bytes within each row so they go high to low
      };
    })
  );

  let changes = $derived.by((): Set<number> => {
    if (memory.currentSnapshot > 0) {
      const diff = memory.diffSnapshots(
        memory.currentSnapshot - 1,
        memory.currentSnapshot
      );

      return new Set(diff.map((d) => d.address));
    }

    return new Set();
  });

  let previousDisabled = $derived(memory.currentSnapshot === 0);
  let nextDisabled = $derived(
    memory.currentSnapshot >= memory.snapshotCount - 1
  );

  function previousSnapshot() {
    memory.previousSnapshot();
  }

  function nextSnapshot() {
    memory.nextSnapshot();
  }

  function toggleByte(index: number, onlyExpand: boolean = false): void {
    if (onlyExpand) {
      expandedBytes[index] = true;
    } else {
      expandedBytes[index] = !expandedBytes[index];
    }
  }

  export function collapseBytes(): void {
    expandedBytes.fill(false);
  }
</script>

<div class="card border-0 shadow p-2 mb-5">
  <div class="card-body">
    <div class="row">
      <div class="col">
        <h5
          class="border-start border-4 border-primary ps-2 mb-3 d-inline-block"
        >
          {displayTitle}
        </h5>

        <div class="float-end bg-light border border-dark-subtle rounded">
          <button
            class="btn btn-sm btn-light"
            class:opacity-25={previousDisabled}
            onclick={previousSnapshot}
            disabled={previousDisabled}
          >
            &laquo;
          </button>

          <small class="text-muted">
            Snapshot
            <span class="text-gradient">{memory.currentSnapshot + 1}</span>
            of {memory.snapshotCount}
          </small>

          <button
            class="btn btn-sm btn-light"
            class:opacity-25={nextDisabled}
            onclick={nextSnapshot}
            disabled={nextDisabled}
          >
            &raquo;
          </button>
        </div>

        <button
          class="btn btn-sm btn-outline-dark float-end me-4"
          class:opacity-25={!anyBytesExpanded}
          onclick={collapseBytes}
          disabled={!anyBytesExpanded}
        >
          Collapse Bytes
        </button>
      </div>
    </div>

    <div class="row my-2">
      <div class="col">
        <p
          class="mb-0 px-3 py-2 bg-light border border-light-subtle font-monospace text-success rounded"
        >
          <small>
            {memory.currentSnapshotMessage}
          </small>
        </p>
      </div>
    </div>

    <div class="row">
      {#each reversedRows as row, reverseIndex}
        <div class="col-12">
          {#if reverseIndex === 0}
            <h6 class="mt-2 text-body-tertiary text-uppercase">
              Stack
              <small class="text-lowercase text-secondary text-opacity-50">
                → ↓
              </small>
            </h6>
          {:else if reverseIndex === heapStartingRowIndex}
            <h6 class="mt-4 text-body-tertiary text-uppercase">
              Heap
              <small class="text-lowercase text-secondary text-opacity-50">
                ← ↑
              </small>
            </h6>
          {/if}
          <Row
            {row}
            {changes}
            allocatedBytes={memory.currentSnapshotAllocatedAddresses}
            {expandedBytes}
            {toggleByte}
          />
        </div>
      {/each}
    </div>

    <p class="text-body-tertiary fs-6 fst-italic mt-4">
      Note: This is a simplified learning tool and only local variables are
      shown. Actual stack frames include things like return addresses, frame
      pointers, and calling metadata. Real memory layout varies by architecture,
      OS, and compiler settings. These examples illustrate general principles
      and concepts but don't necessarily faithfully represent actual memory
      layout on specific systems.
    </p>
  </div>
</div>
