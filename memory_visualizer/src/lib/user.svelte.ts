import {
  Memory,
  INT32_SIZE,
  FIXED_STRING_SIZE,
  getAddressRangeDisplay,
} from "./memory.svelte";

export class UserStruct {
  static readonly EXAMPLE_CODE = `typedef struct
{
    char username[16];
    char password[16];
    int is_admin;
} User;

User *user = malloc(sizeof(User)); 
`;

  static readonly USERNAME_OFFSET = 0;
  static readonly USERNAME_SIZE = FIXED_STRING_SIZE;

  static readonly PASSWORD_OFFSET = UserStruct.USERNAME_SIZE;
  static readonly PASSWORD_SIZE = FIXED_STRING_SIZE;

  static readonly IS_ADMIN_OFFSET =
    UserStruct.USERNAME_SIZE + UserStruct.PASSWORD_SIZE;
  static readonly IS_ADMIN_SIZE = INT32_SIZE;

  static readonly USER_STRUCT_SIZE =
    UserStruct.USERNAME_SIZE +
    UserStruct.PASSWORD_SIZE +
    UserStruct.IS_ADMIN_SIZE;

  memory: Memory = $state();
  baseAddress: number = $state(0);

  addressRange = $derived(
    getAddressRangeDisplay(
      this.baseAddress,
      0,
      UserStruct.USER_STRUCT_SIZE,
      false
    )
  );

  usernameAddress = $derived(this.baseAddress + UserStruct.USERNAME_OFFSET);

  username = $derived(
    this.memory.readString(this.usernameAddress, UserStruct.USERNAME_SIZE).value
  );

  usernameRange = $derived(
    getAddressRangeDisplay(
      this.baseAddress,
      UserStruct.USERNAME_OFFSET,
      UserStruct.USERNAME_SIZE,
      false
    )
  );

  passwordAddress = $derived(this.baseAddress + UserStruct.PASSWORD_OFFSET);
  password = $derived(
    this.memory.readString(this.passwordAddress, UserStruct.PASSWORD_SIZE).value
  );

  passwordRange = $derived(
    getAddressRangeDisplay(
      this.baseAddress,
      UserStruct.PASSWORD_OFFSET,
      UserStruct.PASSWORD_SIZE,
      false
    )
  );

  isAdminAddress = $derived(this.baseAddress + UserStruct.IS_ADMIN_OFFSET);
  is_admin = $derived(this.memory.readInt32(this.isAdminAddress).value);

  isAdminRange = $derived(
    getAddressRangeDisplay(
      this.baseAddress,
      UserStruct.IS_ADMIN_OFFSET,
      UserStruct.IS_ADMIN_SIZE,
      false
    )
  );

  constructor(memory: Memory, baseAddress: number = 0) {
    this.memory = memory;
    this.baseAddress = baseAddress;
  }
}

export class SessionStruct {
  static readonly EXAMPLE_CODE = `typedef struct
{
    int session_id;
    User *user;
} Session;

Session *session = malloc(sizeof(Session)); 
`;

  static readonly SESSION_ID_OFFSET = 0;
  static readonly SESSION_ID_SIZE = INT32_SIZE;

  static readonly USER_POINTER_OFFSET = SessionStruct.SESSION_ID_SIZE;
  static readonly USER_POINTER_SIZE = INT32_SIZE;

  static readonly SESSION_STRUCT_SIZE =
    SessionStruct.SESSION_ID_SIZE + SessionStruct.USER_POINTER_SIZE;

  memory: Memory = $state();
  baseAddress: number = $state(0);

  addressRange = $derived(
    getAddressRangeDisplay(
      this.baseAddress,
      0,
      SessionStruct.SESSION_STRUCT_SIZE,
      false
    )
  );

  sessionIdAddress = $derived(
    this.baseAddress + SessionStruct.SESSION_ID_OFFSET
  );
  sessionId = $derived(this.memory.readInt32(this.sessionIdAddress).value);

  sessionIsActive = $derived(!!this.sessionId);

  sessionIdRange = $derived(
    getAddressRangeDisplay(
      this.baseAddress,
      SessionStruct.SESSION_ID_OFFSET,
      SessionStruct.SESSION_ID_SIZE,
      false
    )
  );

  userPointerAddress = $derived(
    this.baseAddress + SessionStruct.USER_POINTER_OFFSET
  );
  userPointer = $derived(this.memory.readInt32(this.userPointerAddress).value);

  userPointerRange = $derived(
    getAddressRangeDisplay(
      this.baseAddress,
      SessionStruct.USER_POINTER_OFFSET,
      SessionStruct.USER_POINTER_SIZE,
      false
    )
  );

  constructor(memory: Memory, baseAddress: number = 0) {
    this.memory = memory;
    this.baseAddress = baseAddress;
  }
}
