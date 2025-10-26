<script lang="ts">
  import {
    formatHex,
    DisplayType,
    STACK_STARTING_ADDRESS,
  } from "../../memory.svelte";
  import { type Row } from "./types.svelte";

  import MemoryVisualizerByte from "./Byte.svelte";
  import RowValue from "./RowValue.svelte";

  let {
    row,
    changes,
    allocatedBytes,
    expandedBytes,
    toggleByte,
  }: {
    row: Row;
    changes: Set<number>;
    allocatedBytes: Array<boolean>;
    expandedBytes: Array<boolean>;
    toggleByte: Function;
  } = $props();

  let rowStartAddressCssClasses = $derived.by(() => {
    let rowStartAddressCssClasses = "text-primary-emphasis";

    // if (row.startAddress < 36) {
    //   rowStartAddressCssClasses = "text-success";
    // } else if (row.startAddress >= 40 && row.startAddress < 48) {
    //   rowStartAddressCssClasses = "text-warning";
    // }

    return rowStartAddressCssClasses;
  });
</script>

<div class="d-flex align-items-center py-1">
  <span class="font-monospace me-4 {rowStartAddressCssClasses}">
    {formatHex(row.startAddress)}
  </span>

  <div class="byte-grid">
    {#each row.bytes as { address, byte }, byteIndex}
      <MemoryVisualizerByte
        {address}
        {byte}
        allocated={allocatedBytes[address]}
        expanded={expandedBytes[address]}
        changed={changes.has(address)}
        {toggleByte}
      />
    {/each}
  </div>

  {#if row.startAddress < STACK_STARTING_ADDRESS}
    <RowValue bytes={row.bytes} displayMode={DisplayType.String} />
  {:else}
    <RowValue bytes={row.bytes} />
  {/if}
</div>

<style>
  .byte-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 0.5rem;
    flex: 1;
  }
</style>
