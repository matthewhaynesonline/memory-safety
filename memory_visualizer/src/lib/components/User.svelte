<script lang="ts">
  import { formatHex } from "../memory.svelte";
  import { UserStruct } from "../user.svelte";

  import CodeSnippetWrapper from "./CodeSnippetWrapper.svelte";

  let {
    user,
    showCodeAsExpanded = false,
  }: { user: UserStruct; showCodeAsExpanded?: boolean } = $props();

  let userStartingAddress = $derived(formatHex(user.baseAddress));
</script>

<div class="card border-0 shadow p-2">
  <div class="card-body pb-0">
    <h5 class="border-start border-4 border-success ps-2">
      user

      <small>
        <span class="font-monospace">
          {userStartingAddress} ({user.addressRange})
        </span>
      </small>
    </h5>

    <CodeSnippetWrapper code={UserStruct.EXAMPLE_CODE} {showCodeAsExpanded} />

    <div class="d-inline-block w-100 mt-3 mb-2">
      <span class="badge text-success-emphasis bg-success-subtle float-end">
        {UserStruct.USER_STRUCT_SIZE} Bytes
      </span>
    </div>

    <div class="card bg-light border border-light-subtle p-0 mb-4">
      <div class="card-body">
        <div class="row">
          <div class="col font-monospace text-success">
            username

            <span
              class="badge text-body-secondary bg-secondary-subtle float-end"
            >
              {user.usernameRange}
            </span>
          </div>
        </div>

        <div class="row">
          <div class="col">
            {user.username}
          </div>
        </div>
      </div>
    </div>

    <div class="card bg-light border-light-subtle p-0 mt-4">
      <div class="card-body">
        <div class="row">
          <div class="col font-monospace text-success">
            password

            <span
              class="badge text-body-secondary bg-secondary-subtle float-end"
            >
              {user.passwordRange}
            </span>
          </div>
        </div>

        <div class="row">
          <div class="col">
            {user.password}
          </div>
        </div>
      </div>
    </div>

    <div class="card bg-light border-light-subtle p-0 mt-4">
      <div class="card-body">
        <div class="row">
          <div class="col font-monospace text-success">
            is_admin

            <span
              class="badge text-body-secondary bg-secondary-subtle float-end"
            >
              {user.isAdminRange}
            </span>
          </div>
        </div>

        <div class="row">
          <div class="col">
            {#if user.username}
              {user.is_admin}

              {#if user.is_admin === 1}
                <span
                  class="badge text-warning-emphasis bg-warning-subtle float-end"
                >
                  Security Risk
                </span>
              {:else if user.is_admin > 1}
                <span
                  class="badge text-danger-emphasis bg-danger-subtle float-end"
                >
                  Corrupt Value
                </span>
              {/if}
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
