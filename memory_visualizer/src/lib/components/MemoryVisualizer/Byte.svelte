<script lang="ts">
  import { formatHexDisplay, formatHex, Byte } from "../../memory.svelte";

  import ByteDetails from "./ByteDetails.svelte";

  let {
    address,
    byte,
    allocated,
    expanded,
    changed = false,
    toggleByte,
  }: {
    address: number;
    byte: Byte;
    allocated: boolean;
    expanded: boolean;
    changed: boolean;
    toggleByte: Function;
  } = $props();

  let hasValue = $derived(byte.value || byte.isPointer);

  function toggleExpanded() {
    toggleByte(address);
  }
</script>

<div class="byte-wrapper">
  <div
    class="byte-cell bg-light border border-1 border-secondary-subtle rounded-1 p-2 text-center"
    class:bg-primary-subtle={allocated && !changed && !expanded}
    class:bg-success-subtle={changed && !expanded}
    class:bg-info-subtle={expanded}
    class:opacity-25={!hasValue && !allocated}
    class:opacity-50={!hasValue && allocated}
    onclick={toggleExpanded}
  >
    <div class="byte-value text-primary-emphasis font-monospace">
      {formatHex(byte.value)}<br />
    </div>

    {#if byte.isPointer}
      <div
        class="byte-value font-monospace text-uppercase text-warning-emphasis"
      >
        <span>Ptr</span>
      </div>
    {/if}

    <div class="byte-address mt-1 text-muted font-monospace">
      {formatHexDisplay(address)}
    </div>
  </div>

  {#if expanded}
    <ByteDetails {address} {byte} {toggleByte} />
  {/if}
</div>

<style>
  .byte-wrapper {
    display: contents;
  }

  .byte-cell {
    cursor: pointer;
    transition: all 0.2s;
  }

  .byte-cell:hover {
    transform: translateY(-2px);
    border-color: #0d6efd !important;
  }

  .byte-value {
    font-size: 0.85rem;
  }

  .byte-address {
    font-size: 0.7rem;
  }
</style>
