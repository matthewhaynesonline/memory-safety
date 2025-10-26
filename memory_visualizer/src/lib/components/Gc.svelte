<script lang="ts">
  import { formatHexDisplay } from "../memory.svelte";

  import { Memory, MemoryRegion } from "../memory.svelte";

  let { memory }: { memory: Memory } = $props();

  let allocations = $derived(
    memory
      .getSnapshotAllocations(memory.currentSnapshot)
      .sort((a, b) => a.address - b.address)
      .filter((value) => value.region === MemoryRegion.Heap)
  );

  let hasAllocations = $derived(allocations && allocations.length);
</script>

<div class="card border-0 shadow p-2">
  <div class="card-body">
    <h5 class="border-start border-4 border-info ps-2">Garbage Collector</h5>

    {#if hasAllocations}
      <table class="table table-striped table-hover">
        <thead>
          <tr>
            <th>Address</th>
            <th>Size (Bytes)</th>
            <th>Ref Count</th>
          </tr>
        </thead>

        <tbody class="font-monospace">
          {#each allocations as allocation}
            <tr>
              <td>
                {formatHexDisplay(allocation.address)}
              </td>
              <td>{allocation.size}</td>
              <td>{allocation.refCount}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>
