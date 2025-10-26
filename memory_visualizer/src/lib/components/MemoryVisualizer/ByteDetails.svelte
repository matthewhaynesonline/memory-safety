<script lang="ts">
  import { Byte, formatHexDisplay } from "../../memory.svelte";

  let {
    address,
    byte,
    toggleByte,
  }: { address: number; byte: Byte; toggleByte: Function } = $props();

  function doPointer(): void {
    toggleByte(byte.value, true);
  }
</script>

<div
  class="byte-details rounded p-3 bg-body-secondary border border-light-subtle"
>
  <div class="row">
    <div class="col px-4">
      <div class="row">
        <div class="col">
          <small class="text-muted d-block mb-1">Address</small>

          <span class="font-monospace text-primary-emphasis">
            {formatHexDisplay(address)}
          </span>

          {#if byte.isPointer}
            <button
              type="button"
              class="btn btn-link font-monospace"
              onclick={doPointer}
            >
              Pointer to {formatHexDisplay(byte.value)} ↗
            </button>
          {/if}
        </div>
      </div>

      <div class="row g-3 mt-1 mb-3">
        <div class="col ps-0">
          <div class="bg-light rounded border border-dark-subtle p-3">
            <small class="text-muted d-block mb-1">Decimal</small>
            <span class="fs-4 font-monospace">{byte.value} </span>
          </div>
        </div>

        <div class="col">
          <div class="bg-light rounded border border-dark-subtle p-3">
            <a href="https://en.wikipedia.org/wiki/Hexadecimal" target="_blank">
              <small class="text-muted d-block mb-1">Hex</small>
            </a>
            <span class="fs-4 font-monospace"
              >{formatHexDisplay(byte.value)}
            </span>
          </div>
        </div>

        <div class="col pe-0">
          <div class="bg-light rounded border border-dark-subtle p-3">
            <a href="https://en.wikipedia.org/wiki/ASCII" target="_blank">
              <small class="text-muted d-block mb-1">ASCII</small>
            </a>
            <span class="fs-4 font-monospace">
              {byte.value >= 32 && byte.value < 127
                ? String.fromCharCode(byte.value)
                : "·"}
            </span>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col bg-light rounded border border-dark-subtle p-3">
          <small class="text-muted d-block mb-2">Bits</small>
          <div class="bits-grid font-monospace">
            {#each byte.bits as bit, i}
              <div
                class="bit-cell badge rounded-1 p-1 text-center"
                class:bg-primary={bit}
                class:bg-body-secondary={!bit}
                class:text-body-secondary={!bit}
              >
                <div class="fs-5">{bit}</div>
                <div class="bit-index mt-1 opacity-75 fs-6">{7 - i}</div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .byte-details {
    grid-column: 1 / -1;
  }

  .bits-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 0.75rem;
  }
</style>
