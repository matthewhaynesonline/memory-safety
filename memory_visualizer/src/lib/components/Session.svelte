<script lang="ts">
  import { formatHexDisplay, formatHex } from "../memory.svelte";
  import { UserStruct, SessionStruct } from "../user.svelte";

  import CodeSnippetWrapper from "./CodeSnippetWrapper.svelte";

  let {
    user,
    session,
    showCodeAsExpanded = false,
  }: {
    user: UserStruct;
    session: SessionStruct;
    showCodeAsExpanded?: boolean;
  } = $props();

  let sessionStartingAddress = $derived(formatHex(session.baseAddress));

  let userPointerAddressDisplay = $derived.by(() => {
    let userPointerAddressDisplay = "";

    if (session.sessionId) {
      userPointerAddressDisplay = formatHexDisplay(session.userPointer);
    }

    return userPointerAddressDisplay;
  });

  let userEmpty = $derived(!user.username);
  let userIsCorrupted = $derived(user.is_admin > 1);

  let userPointerIsValid = $derived(
    session.sessionIsActive && !userEmpty && !userIsCorrupted
  );

  let userPointerIsDangling = $derived(session.sessionIsActive && userEmpty);

  let userPointerIsCorrupted = $derived(
    session.sessionIsActive && userIsCorrupted
  );
</script>

<div class="card border-0 shadow p-2">
  <div class="card-body pb-0">
    <h5 class="border-start border-4 border-warning ps-2">
      session

      <small>
        <span class="font-monospace">
          {sessionStartingAddress} ({session.addressRange})
        </span>
      </small>
    </h5>

    <CodeSnippetWrapper
      code={SessionStruct.EXAMPLE_CODE}
      {showCodeAsExpanded}
    />
    <div class="d-inline-block w-100 mt-3 mb-2">
      <span class="badge text-warning-emphasis bg-warning-subtle float-end">
        {SessionStruct.SESSION_STRUCT_SIZE} Bytes
      </span>
    </div>

    <div class="card bg-light border-light-subtle p-0 mb-4">
      <div class="card-body">
        <div class="row">
          <div class="col font-monospace text-success">
            session_id

            <span
              class="badge text-body-secondary bg-secondary-subtle float-end"
            >
              {session.sessionIdRange}
            </span>
          </div>
        </div>

        <div class="row">
          <div class="col">
            {session.sessionId}
          </div>
        </div>
      </div>
    </div>

    <div class="card bg-light border-light-subtle p-0 mt-4">
      <div class="card-body">
        <div class="row">
          <div class="col font-monospace text-success">
            *user

            <span
              class="badge text-body-secondary bg-secondary-subtle float-end"
            >
              {session.userPointerRange}
            </span>
          </div>
        </div>

        <div class="row">
          <div class="col">
            {userPointerAddressDisplay}

            {#if userPointerAddressDisplay}
              {#if userPointerIsValid}
                <span
                  class="badge text-success-emphasis bg-success-subtle float-end"
                >
                  Valid Pointer
                </span>
              {:else if userPointerIsCorrupted}
                <span
                  class="badge text-danger-emphasis bg-danger-subtle float-end"
                >
                  Pointer to Corrupted
                </span>
              {:else if userPointerIsDangling}
                <span
                  class="badge text-danger-emphasis bg-danger-subtle float-end"
                >
                  Dangling Pointer
                </span>
              {/if}
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
