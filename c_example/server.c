/**
 * Mem Safety Demo
 *
 * This code demonstrates two memory safety vulnerabilities:
 * 1. Buffer overflow - bounds checking issue
 * 2. Use-after-free - aliasing/lifetime issue (borrow checker)
 *
 * It's actually vulnerable, don't use it.
 */

#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <time.h>

#define PORT 8080
#define BUFFER_SIZE 8192
#define MAX_SESSIONS 10
#define TEMPLATE_BUFFER_SIZE 8192

/**
 * User struct with buffer overflow vulnerability
 * Memory layout (on typical systems):
 *   [username: 16 bytes]
 *   [password: 16 bytes]
 *   [is_admin: 4 bytes]
 *
 * If password overflows past 16 bytes, it writes into is_admin
 */
typedef struct
{
    char username[16];
    char password[16];
    int is_admin;
} User;

/**
 * Session structure with potential user dangling pointer
 */
typedef struct
{
    int session_id;
    User *user;
} Session;

// Global state
User *authenticated_user = NULL;
Session *sessions[MAX_SESSIONS] = {0};
Session *current_session = NULL;
int next_session_id = 1;

// ------------------
// Session Management
// ------------------
int session_is_valid(void)
{
    if (current_session == NULL)
    {
        return 0;
    }

    for (int i = 0; i < MAX_SESSIONS; i++)
    {
        if (sessions[i] == current_session)
        {
            return 1;
        }
    }

    return 0;
}

int user_is_valid(void)
{
    if (current_session == NULL || current_session->user == NULL)
    {
        return 0;
    }

    if (authenticated_user == NULL)
    {
        return 0;
    }

    return (current_session->user == authenticated_user);
}

int create_session(User *user)
{
    if (!user)
    {
        return -1;
    }

    for (int i = 0; i < MAX_SESSIONS; i++)
    {
        if (sessions[i] == NULL)
        {
            Session *session = malloc(sizeof(Session));

            if (!session)
            {
                return -1;
            }

            session->session_id = next_session_id++;
            session->user = user;

            sessions[i] = session;
            current_session = session;

            printf("\nSession Created");
            printf("\n---------------\n");
            printf("Session address: %p\n", (void *)session);
            printf("ID: %d\n", session->session_id);
            printf("User address: %p\n", (void *)user);
            printf("Username: %s\n", user->username);
            printf("current_session pointer: %p\n", (void *)current_session);

            return session->session_id;
        }
    }

    return -1;
}

void free_user(User *user)
{
    if (!user)
    {
        return;
    }

    printf("\nUser Freed");
    printf("\n----------\n");
    printf("User address: %p\n", (void *)user);
    printf("Username: %s\n", user->username);

    free(user);

    if (authenticated_user == user)
    {
        authenticated_user = NULL;
    }

    printf("Any sessions referencing this user now have a dangling pointer!\n");
}

void expire_session(int session_id)
{
    for (int i = 0; i < MAX_SESSIONS; i++)
    {
        if (sessions[i] && sessions[i]->session_id == session_id)
        {
            Session *session = sessions[i];

            printf("\nSession Expired");
            printf("\n---------------\n");
            printf("Session address: %p\n", (void *)session);
            printf("ID: %d\n", session->session_id);

            free(session);
            sessions[i] = NULL;

            if (user_is_valid())
            {
                printf("<strong>Session freed, but user still exists at: %p\n</strong>", (void *)(current_session ? current_session->user : NULL));
            }

            return;
        }
    }
}

// --------
// Mem Helpers
// --------
void print_memory_layout(const char *label, User *u)
{
    printf("\n%s\n", label);
    printf("Address of username:  %p\n", (void *)&u->username);
    printf("Address of password:  %p (offset: %ld bytes)\n",
           (void *)&u->password,
           (long)((char *)&u->password - (char *)&u->username));

    printf("Address of is_admin:  %p (offset: %ld bytes)\n",
           (void *)&u->is_admin,
           (long)((char *)&u->is_admin - (char *)&u->username));

    printf("Values:\n");
    printf("  username:  '");

    for (size_t i = 0; i < sizeof(u->username) && u->username[i]; i++)
    {
        if (u->username[i] >= 32 && u->username[i] <= 126)
        {
            printf("%c", u->username[i]);
        }
        else
        {
            printf("\\x%02x", (unsigned char)u->username[i]);
        }
    }

    printf("'\n  password:  '");

    for (size_t i = 0; i < sizeof(u->password) && u->password[i]; i++)
    {
        if (u->password[i] >= 32 && u->password[i] <= 126)
        {
            printf("%c", u->password[i]);
        }
        else
        {
            printf("\\x%02x", (unsigned char)u->password[i]);
        }
    }

    printf("'\n  is_admin:  %d (0x%08x)\n", u->is_admin, u->is_admin);
}

// ------------
// HTTP Helpers
// ------------
void send_response(int client_socket, const char *status, const char *content_type, const char *body)
{
    char header[512];
    snprintf(header, sizeof(header),
             "HTTP/1.1 %s\r\n"
             "Content-Type: %s\r\n"
             "Content-Length: %zu\r\n"
             "Connection: close\r\n"
             "\r\n",
             status, content_type, strlen(body));

    send(client_socket, header, strlen(header), 0);
    send(client_socket, body, strlen(body), 0);
}

int template_buffer_append(char *buffer, size_t total_size, size_t *used, const char *str)
{
    size_t space_left = total_size - *used;

    int chars_written = snprintf(buffer + *used, space_left, "%s", str);

    if (chars_written < 0 || (size_t)chars_written >= space_left)
    {
        return 0;
    }

    *used += (size_t)chars_written;
    return 1;
}

void send_html_template(int client_socket, const char *status, const char *body_fragment)
{
    char *template_buffer = malloc(TEMPLATE_BUFFER_SIZE);
    if (!template_buffer)
    {
        send_response(client_socket, "500 Internal Server Error", "text/plain", "Allocation failed");
        return;
    }

    const char *template_header =
        "<!DOCTYPE html>\n"
        "<html>\n"
        "<head><meta charset='utf-8'><title>Memory Safety Demo</title><style>body{font-family:system-ui,sans-serif;background:#f5f5f7;color:#333;line-height:1.6;margin:2rem auto;max-width:700px;padding:0 1rem}h1,h2,h3{color:#111}a{color:#06c;text-decoration:none}a:hover{text-decoration:underline}</style></head>\n"
        "<body>\n"
        "  <nav>\n"
        "    <a href='/'>Home</a> | <a href='/check-user'>Check User</a> | <a href='/corrupt'>Corrupt Memory</a> | <a href='/secret'>Top Secret ( ͡° ͜ʖ ͡°)</a> | <a href='/login'>Login</a> | <a href='/logout'>Logout</a>\n"
        "  </nav>\n"
        "  <main>\n";

    const char *template_footer =
        "  </main>\n"
        "</body>\n"
        "</html>";

    size_t used = 0;

    int success = template_buffer_append(template_buffer, TEMPLATE_BUFFER_SIZE, &used, template_header) &&
                  template_buffer_append(template_buffer, TEMPLATE_BUFFER_SIZE, &used, body_fragment) &&
                  template_buffer_append(template_buffer, TEMPLATE_BUFFER_SIZE, &used, template_footer);

    if (success)
    {
        send_response(client_socket, status, "text/html", template_buffer);
    }
    else
    {
        send_response(client_socket, "500 Internal Server Error", "text/plain", "Response too large");
    }

    free(template_buffer);
}

void send_text_in_template(int client_socket, const char *status, const char *text)
{
    char *fragment = malloc(TEMPLATE_BUFFER_SIZE / 2);
    if (!fragment)
    {
        send_response(client_socket, "500 Internal Server Error", "text/plain", "Allocation failed");
        return;
    }

    int chars_written = snprintf(fragment, TEMPLATE_BUFFER_SIZE / 2, "<pre>%s</pre>", text);
    if (chars_written < 0 || (size_t)chars_written >= TEMPLATE_BUFFER_SIZE / 2)
    {
        free(fragment);
        send_response(client_socket, "500 Internal Server Error", "text/plain", "Text too large");
        return;
    }

    send_html_template(client_socket, status, fragment);

    free(fragment);
}

void send_error(int client_socket, const char *status, const char *message)
{
    send_text_in_template(client_socket, status, message);
}

// -------
// Routes
// -------
void handle_home(int client_socket)
{
    const char *body =
        "<h1>Memory Safety Vulnerability Demos</h1>\n"
        "<section>\n"
        "  <h2>Demo 1: <a href='https://en.wikipedia.org/wiki/Buffer_overflow' target='_blank'>Buffer Overflow (Bounds Checking)</a></h2>\n"
        "  <pre>\n"
        "# Normal login (creates a session automatically):\n"
        "curl -X POST http://localhost:8080/login -d 'username=alice&password=secret'\n\n"
        "# Simple overflow (demonstration):\n"
        "curl -X POST http://localhost:8080/login -d 'username=alice&password=secret0123456789876543210'\n\n"
        "# Gain admin access (overflow into is_admin):\n"
        "printf 'username=alice&password=secret0123456789\\x01\\x00\\x00\\x00' | curl -X POST http://localhost:8080/login --data-binary @-\n"
        "  </pre>\n"
        "</section>\n"
        "<section>\n"
        "  <h2>Demo 2: <a href='https://en.wikipedia.org/wiki/Dangling_pointer' target='_blank'>Dangling Pointer (Use After Free)</a></h2>\n"
        "  <pre>\n"
        "# 1. Login to create a User (and a Session):\n"
        "curl -X POST http://localhost:8080/login -d 'username=alice&password=secret'\n\n"
        "# 2. Check session/user (safe while User exists):\n"
        "curl -X GET http://localhost:8080/check-user\n\n"
        "# 3. Logout (frees the User memory):\n"
        "curl -X GET http://localhost:8080/logout\n\n"
        "# 4. Corrupt the freed memory (allocate something else in same spot):\n"
        "curl -X GET http://localhost:8080/corrupt\n\n"
        "# 5. Try to access session (DANGER - reads corrupted memory!):\n"
        "curl -X GET http://localhost:8080/check-user\n"
        "  </pre>\n"
        "</section>\n";

    send_html_template(client_socket, "200 OK", body);
}

void handle_login_form(int client_socket)
{
    const char *body =
        "<h1>Login</h1>\n"
        "<form method='POST' action='/login'>\n"
        "  <label>Username: <input type='text' name='username' /></label><br/>\n"
        "  <label>Password: <input type='password' name='password' /></label><br/>\n"
        "  <button type='submit'>Login</button>\n"
        "</form>\n";

    send_html_template(client_socket, "200 OK", body);
}

void handle_login(int client_socket, char *body)
{
    printf("Login Attempt\n");
    printf("-------------\n");

    User *user = malloc(sizeof(User));
    if (!user)
    {
        send_error(client_socket, "500 Internal Server Error", "Memory allocation failed");
        return;
    }

    memset(user, 0, sizeof(User));
    user->is_admin = 0;

    print_memory_layout("Before login:", user);

    printf("\nRequest body: %s\n", body);

    // Parse username and password from request body
    char *username_start = strstr(body, "username=");
    char *password_start = strstr(body, "password=");

    if (!username_start || !password_start)
    {
        free(user);
        send_error(client_socket, "400 Bad Request", "Missing username or password");
        return;
    }

    username_start += 9; // Skip "username="
    password_start += 9; // Skip "password="

    // Find the end of username and password (either & or end of string)
    char *username_end = strchr(username_start, '&');
    size_t username_len = username_end ? (size_t)(username_end - username_start) : strlen(username_start);

    char *password_end = strchr(password_start, '&');
    size_t password_len = password_end ? (size_t)(password_end - password_start) : strlen(password_start);

    printf("\nParsed credentials:\n");
    printf("  username length: %zu\n", username_len);
    printf("  password length: %zu\n", password_len);

    if (password_len >= sizeof(user->password))
    {
        printf("\nOverflow Detected!");
        printf("\n------------------\n");
        printf("Password is %zu bytes, buffer is %zu bytes\n", password_len, sizeof(user->password));
        printf("Overflow: %zu bytes will write into is_admin\n", password_len - sizeof(user->password));
    }

    printf("Calling vulnerable memcpy!\n");
    printf("--------------------------\n");

    // Only copy up to 16 chars for username
    size_t username_copy_len = username_len < sizeof(user->username) - 1 ? username_len : sizeof(user->username) - 1;
    memcpy(user->username, username_start, username_copy_len);
    user->username[username_copy_len] = '\0';

    // Vulnerable: no bounds checking on password
    // If password_len > 16, memcpy writes past the end of user.password
    // and into user.is_admin (potentially allowing privilege escalation)
    memcpy(user->password, password_start, password_len);
    if (password_len < sizeof(user->password))
    {
        user->password[password_len] = '\0';
    }

    print_memory_layout("After login:", user);

    // If there was a previous authenticated_user, free it
    // "There can only be one"
    if (authenticated_user)
    {
        free(authenticated_user);
    }

    authenticated_user = user;

    int session_id = create_session(authenticated_user);

    char fragment[TEMPLATE_BUFFER_SIZE / 4];

    if (user->is_admin)
    {
        snprintf(fragment, sizeof(fragment),
                 "<h1>ADMIN Login successful</h1>\n"
                 "<p>User: %s</p>\n"
                 "<p>is_admin: %d</p>\n"
                 "<p>User address: %p</p>\n"
                 "<p>Session ID: %d</p>\n"
                 "<p>Session address: %p</p>\n"
                 "<p><strong>Admin</strong> user access only.</p>\n"
                 "<p><a href='/secret'>Go to secret page</a></p>\n",
                 user->username, user->is_admin, (void *)user, session_id, (void *)current_session);

        send_html_template(client_socket, "200 OK", fragment);

        return;
    }
    else
    {
        snprintf(fragment, sizeof(fragment),
                 "<h1>Login successful</h1>\n"
                 "<p>User: %s</p>\n"
                 "<p>is_admin: %d</p>\n"
                 "<p>User address: %p</p>\n"
                 "<p>Session ID: %d</p>\n"
                 "<p>Session address: %p</p>\n"
                 "<p>Regular user access only.</p>\n"
                 "<p><a href='/check-user'>Check session / user info.</a></p>\n",
                 user->username, user->is_admin, (void *)user, session_id, (void *)current_session);

        send_html_template(client_socket, "200 OK", fragment);

        return;
    }
}

void handle_logout(int client_socket)
{
    printf("Logout (free user)\n");
    printf("------------------\n");

    if (!authenticated_user)
    {
        send_error(client_socket, "400 Bad Request", "No user to logout");
        return;
    }

    User *user_to_free = authenticated_user;
    free_user(user_to_free);

    char fragment[512];
    snprintf(fragment, sizeof(fragment),
             "<h1>User logged out</h1>\n"
             "<pre>\n"
             "User address (now freed): %p\n"
             "current_session pointer: %p\n"
             "current_session->user pointer: %p\n"
             "The User memory has been freed, but the Session still holds a pointer to it. <strong>This is a dangling pointer!</strong>\n"
             "Any attempt to access current_session->user is undefined behavior.\n\n"
             "Visit <a href='/corrupt'>/corrupt</a> to allocate new data in the freed memory, then <a href='/check-user'>/check-user</a> to see potential corruption.\n"
             "</pre>\n",
             (void *)user_to_free,
             (void *)current_session,
             (void *)(current_session ? current_session->user : NULL));

    send_html_template(client_socket, "200 OK", fragment);
}

void handle_corrupt(int client_socket)
{
    printf("Attempting to corrupt freed memory\n");
    printf("----------------------------------\n");

    if (!current_session || !current_session->user)
    {
        send_text_in_template(client_socket, "400 Bad Request",
                              "No freed user to corrupt. First:\n"
                              "1. Login to create a user\n"
                              "2. Logout to free the user\n"
                              "3. Then visit /corrupt");

        return;
    }

    // Allocate new memory. Could reuse the freed User's address
    void *target_addr = (void *)current_session->user;
    printf("  Target (freed) address: %p\n", target_addr);

    char *corrupted_data = malloc(sizeof(User));
    if (!corrupted_data)
    {
        send_error(client_socket, "500 Internal Server Error", "Allocation failed");
        return;
    }

    if ((void *)corrupted_data == target_addr)
    {
        printf("Fast path: allocator returned the same address immediately: %p\n",
               (void *)corrupted_data);
    }
    else
    {
        free(corrupted_data);
        corrupted_data = NULL;

        const int MAX_ATTEMPTS = 50;
        const int SPRAY_COUNT = 32;
        const int SPRAY_VARY = 4;

        int matched = 0;

        for (int attempt = 0; attempt < MAX_ATTEMPTS && !matched; attempt++)
        {
            // Spray allocations to try to disrupt mem state
            void *spray[SPRAY_COUNT];

            for (int i = 0; i < SPRAY_COUNT; i++)
            {
                size_t s = sizeof(User) + (i % SPRAY_VARY);
                spray[i] = malloc(s);

                if (!spray[i])
                    break;

                memset(spray[i], 0x41, s);
            }

            for (int i = 0; i < SPRAY_COUNT; i++)
            {
                if (spray[i])
                {
                    free(spray[i]);
                }
            }

            // Try several allocations after spray
            for (int allocation_attempt = 0; allocation_attempt < 5; allocation_attempt++)
            {
                char *temp_ptr = malloc(sizeof(User));

                if (!temp_ptr)
                {
                    break;
                }

                if ((void *)temp_ptr == target_addr)
                {
                    corrupted_data = temp_ptr;
                    matched = 1;
                    break;
                }

                free(temp_ptr);
            }

            usleep(1000);
        }

        if (!matched)
        {
            corrupted_data = malloc(sizeof(User));

            if (!corrupted_data)
            {
                send_error(client_socket, "500 Internal Server Error", "Allocation failed (final)");
                return;
            }

            printf("Fallback: allocator didn't return same address. Allocated at %p\n",
                   (void *)corrupted_data);
        }
        else
        {
            printf("Success: reused target address %p\n", (void *)corrupted_data);
        }
    }

    memset(corrupted_data, 0x42, sizeof(User));
    strncpy(corrupted_data, "CORRUPTED!!!", sizeof(User) - 1);

    printf("Filled %p with 0x42 and 'CORRUPTED!!!'\n", (void *)corrupted_data);
    printf("Session's user pointer still: %p\n", target_addr);

    char fragment[TEMPLATE_BUFFER_SIZE / 4];

    snprintf(fragment, sizeof(fragment),
             "<h1>Memory Corrupted!</h1>\n"
             "<pre>\n"
             "New allocation address: %p\n"
             "Session's user pointer: %p\n\n"
             "%s\n\n"
             "Now visit <a href='/check-user'>/check-user</a> to see the corrupted data.\n",
             (void *)corrupted_data,
             target_addr,
             ((void *)corrupted_data == target_addr)
                 ? "✓ Memory reused at <strong>same address</strong>. Corruption likely visible."
                 : "Note: Allocator used different address. Corruption may not be visible.");

    send_html_template(client_socket, "200 OK", fragment);

    // Don't free corrupted_data to leave it visible
}

void handle_check_user(int client_socket)
{
    printf("Checking Current User / Session\n");
    printf("-------------------------------\n");
    printf("current_session pointer: %p\n", (void *)current_session);

    if (current_session == NULL)
    {
        send_text_in_template(client_socket, "200 OK", "No current session");
        return;
    }

    int user_valid = user_is_valid();
    int session_valid = session_is_valid();

    if (!user_valid)
    {
        printf("User not valid (UAF)!\n");
    }

    if (!session_valid)
    {
        printf("Session not valid (UAF)!\n");
    }

    const char *username_display = "(unable to read)";
    int is_admin_display = -1;
    char raw_bytes[64] = {0};

    if (current_session && current_session->user)
    {
        // Vulnerable: accessing potentially freed memory
        User *u = current_session->user;

        if (u->username[0] != '\0')
        {
            username_display = u->username;
        }

        is_admin_display = u->is_admin;

        // Show raw bytes to demonstrate corruption
        unsigned char *bytes = (unsigned char *)u;
        int offset = 0;
        for (int i = 0; i < 36 && offset < 60; i++)
        {
            offset += snprintf(raw_bytes + offset, sizeof(raw_bytes) - offset,
                               "%02x ", bytes[i]);
        }
    }

    char fragment[TEMPLATE_BUFFER_SIZE / 4];

    snprintf(fragment, sizeof(fragment),
             "<h1>Session / User Check</h1>\n"
             "<pre>\n"
             "%s%s\n\n"
             "Current session (address %p):\n"
             "  Session ID: %d\n"
             "  User pointer: %p\n\n"
             "User data (address %p):\n"
             "  Username: %s\n"
             "  Is Admin: %d (0x%08x)\n"
             "  Raw bytes: %s\n\n"
             "%s\n"
             "</pre>\n",
             session_valid ? "" : "!  Session UAF! ",
             user_valid ? "✓ User is valid" : "!  User UAF!",
             (void *)current_session,
             current_session->session_id,
             (void *)current_session->user,
             (void *)current_session->user,
             username_display,
             is_admin_display,
             is_admin_display,
             raw_bytes,
             user_valid ? "The pointers are still valid." : "The User memory was freed but Session still references it.\n"
                                                            "If you see 0x42 (B) bytes or 'CORRUPTED!!!', the memory was reused.\n"
                                                            "This demonstrates use after free: reading freed memory can return garbage,\n"
                                                            "corrupt data, or cause crashes!");

    send_html_template(client_socket, "200 OK", fragment);
}

void handle_secret(int client_socket)
{
    printf("Accessing /secret\n");
    printf("-----------------\n");

    if (!session_is_valid())
    {
        send_text_in_template(client_socket, "403 Forbidden", "403 Forbidden: No valid session. You must login first.");
        return;
    }

    if (!user_is_valid())
    {
        send_text_in_template(client_socket, "403 Forbidden", "403 Forbidden: User pointer invalid (use-after-free). Login again.");
        return;
    }

    User *u = current_session->user;
    if (!u->is_admin)
    {
        char fragment[1024];
        snprintf(fragment, sizeof(fragment),
                 "<h1>403 Forbidden: You are not an admin.</h1>\n"
                 "<pre>\n"
                 "TOP SECRET DATA\n"
                 "  MATT ■■■ ■ ■■■■■■■■■ ■■■■■■■■■ ■■ ■■■ ■■■■! ■■■■■■■ ■■ ■■■■■■. ■■■■■■■■■■■\n"
                 "</pre>\n");

        send_html_template(client_socket, "403 Forbidden", fragment);
        return;
    }

    char fragment[1024];
    snprintf(fragment, sizeof(fragment),
             "<h1>Secret Admin Page</h1>\n"
             "<pre>\n"
             "TOP SECRET DATA\n"
             "  MATT WAS A WORDPRESS DEVELOPER AT ONE TIME! SILENCE IS GOLDEN. ＼(º □ º )/\n"
             "</pre>\n");

    send_html_template(client_socket, "200 OK", fragment);
}

// -------
// Router
// -------
void handle_request(int client_socket)
{
    char buffer[BUFFER_SIZE];

    // Read the HTTP request
    ssize_t bytes_read = recv(client_socket, buffer, sizeof(buffer) - 1, 0);

    if (bytes_read <= 0)
    {
        close(client_socket);
        return;
    }

    buffer[bytes_read] = '\0';

    // Parse the request line (e.g., "GET /hello HTTP/1.1")
    char method[16], path[256];

    if (sscanf(buffer, "%15s %255s", method, path) != 2)
    {
        send_error(client_socket, "400 Bad Request", "Invalid request");
        close(client_socket);
        return;
    }

    printf("\n> Request: %s %s\n", method, path);

    if (strcmp(method, "GET") == 0 && strcmp(path, "/") == 0)
    {
        handle_home(client_socket);
    }
    else if (strcmp(method, "GET") == 0 && strcmp(path, "/login") == 0)
    {
        handle_login_form(client_socket);
    }
    else if (strcmp(method, "POST") == 0 && strcmp(path, "/login") == 0)
    {
        // Find the request body
        char *body = strstr(buffer, "\r\n\r\n");
        if (body)
        {
            body += 4; // Skip "\r\n\r\n"
            handle_login(client_socket, body);
        }
        else
        {
            send_error(client_socket, "400 Bad Request", "Missing request body");
        }
    }
    else if (strcmp(method, "GET") == 0 && strcmp(path, "/logout") == 0)
    {
        handle_logout(client_socket);
    }
    else if (strcmp(method, "GET") == 0 && strcmp(path, "/corrupt") == 0)
    {
        handle_corrupt(client_socket);
    }
    else if (strcmp(method, "GET") == 0 && strcmp(path, "/check-user") == 0)
    {
        handle_check_user(client_socket);
    }
    else if (strcmp(method, "GET") == 0 && strcmp(path, "/secret") == 0)
    {
        handle_secret(client_socket);
    }
    else
    {
        send_error(client_socket, "404 Not Found", "Endpoint not found");
    }

    close(client_socket);
}

// -------
// Main
// -------
int main(void)
{
    int server_socket = socket(AF_INET, SOCK_STREAM, 0);
    if (server_socket < 0)
    {
        perror("socket");
        return 1;
    }

    // Allow reusing the address
    int opt = 1;
    setsockopt(server_socket, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in server_addr = {0};
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(PORT);

    if (bind(server_socket, (struct sockaddr *)&server_addr, sizeof(server_addr)) < 0)
    {
        perror("bind");
        close(server_socket);
        return 1;
    }

    if (listen(server_socket, 10) < 0)
    {
        perror("listen");
        close(server_socket);
        return 1;
    }

    printf("\n");
    printf("Mem Safety Demo Server\n\n");
    printf("http://localhost:%d\n", PORT);
    printf("----------------------\n");
    printf("\nEndpoints:\n");
    printf("  GET  /            - Home page with examples\n");
    printf("  GET  /login       - Login form\n");
    printf("  POST /login       - Login endpoint (!vulnerable can overflow!)\n");
    printf("  GET  /logout      - Logout and free the User (creates dangling pointer in Session)\n");
    printf("  GET  /corrupt     - Allocate new data to try to corrupt freed memory\n");
    printf("  GET  /check-user  - Check current user / session (may hit UAF)\n");
    printf("  GET  /secret      - Admin only secret page (requires session && admin)\n");
    printf("\n\n");
    printf("Demo 1: Buffer Overflow (Bounds Checking)\n");
    printf("-----------------------------------------\n");
    printf("\nPrecise overflow (set is_admin = 1):\n");
    printf("  printf 'username=alice&password=secret0123456789\\x01\\x00\\x00\\x00' | \\\n");
    printf("    curl -X POST http://localhost:%d/login --data-binary @-\n", PORT);
    printf("\n\n");
    printf("Demo 2: Use-After-Free (Lifetimes)\n");
    printf("----------------------------------\n");
    printf("\n1. Login (creates a session):\n");
    printf("  curl -X POST http://localhost:%d/login -d 'username=alice&password=secret'\n", PORT);
    printf("\n2. Check session/user (safe):\n");
    printf("  curl -X GET http://localhost:%d/check-user\n", PORT);
    printf("\n3. Logout (frees user -> dangling pointer):\n");
    printf("  curl -X GET http://localhost:%d/logout\n", PORT);
    printf("\n4. Corrupt freed memory:\n");
    printf("  curl -X GET http://localhost:%d/corrupt\n", PORT);
    printf("\n5. Access session->user (use-after-free - see corruption!):\n");
    printf("  curl -X GET http://localhost:%d/check-user\n", PORT);
    printf("\n\n");
    printf("Waiting for connections...\n");

    while (1)
    {
        struct sockaddr_in client_addr;
        socklen_t client_len = sizeof(client_addr);

        int client_socket = accept(server_socket, (struct sockaddr *)&client_addr, &client_len);

        if (client_socket < 0)
        {
            perror("accept");
            continue;
        }

        handle_request(client_socket);
    }

    close(server_socket);
    return 0;
}
