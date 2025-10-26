"""
Python: Use-After-Free Prevention

In C, you can free memory but still have pointers to it (dangling pointers).
Python's garbage collector makes this impossible.
"""


class Data:
    def __init__(self, value):
        self.value = value

    def __del__(self):
        print(f"  → Data({self.value}) is being destroyed")


# === Example: Multiple references keep object alive ===
print("=== Creating object with 2 references ===")
ref1 = Data(42)
ref2 = ref1  # Both point to the same object

print(f"ref1.value = {ref1.value}")
print(f"ref2.value = {ref2.value}")

print("\n=== Delete ref1 (like 'free' in C) ===")
ref1 = None

# In C, ref2 would now be a dangling pointer!
# In Python, the object still exists:
print(f"ref2.value = {ref2.value}")
print("✓ Object still alive - ref2 keeps it in memory")

print("\n=== Delete ref2 (last reference) ===")
ref2 = None
print("✓ NOW the object is destroyed")

print("\n=== Why this matters ===")


def create_container():
    data = Data(100)
    container = {"stored": data}
    return container


result = create_container()
# In C, 'data' would be freed when the function returns
# In Python, it lives on because container holds a reference
print(f"Accessing data after function returned: {result['stored'].value}")
print("✓ No use-after-free - garbage collector tracks all references")
