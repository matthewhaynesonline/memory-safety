<script lang="ts">
  import { formatHexDisplay } from "../memory.svelte";
  import { Heap } from "../stack_frame_heap.svelte";

  let { heap }: { heap: Heap } = $props();
</script>

<div class="card border-0 shadow p-2">
  <div class="card-body">
    <h5 class="border-start border-4 border-info ps-2">Heap</h5>

    {#if heap.hasAllocations}
      <table class="table table-striped table-hover">
        <thead>
          <tr>
            <th>Address</th>
            <th>Size (Bytes)</th>
            <th>Value</th>
          </tr>
        </thead>

        <tbody class="font-monospace">
          {#each heap.variables as allocation}
            <tr>
              <td>
                {formatHexDisplay(allocation.address)}
              </td>
              <td>{allocation.size}</td>
              <td>{allocation.value}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>
