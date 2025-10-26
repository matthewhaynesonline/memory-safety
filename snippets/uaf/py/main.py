"""
Python: Use After Free Prevention

In C, you can free memory but still have pointers to it (dangling pointers).
Python's garbage collector prevents this.
"""


class Data:
    def __init__(self, value):
        self.value = value

    def __del__(self):
        print(f"  → Data({self.value}) is being destroyed")


# Example: Multiple references keep object alive
def example_1() -> None:
    print("Creating object with 2 references")
    ref1 = Data(42)
    ref2 = ref1  # Both point to the same object

    print(f"ref1.value = {ref1.value}")
    print(f"ref2.value = {ref2.value}")

    print("\nDelete ref1 (like 'free' in C)")
    ref1 = None

    # In C, ref2 would now be a dangling pointer
    # In Python, the object still exists
    print(f"ref2.value = {ref2.value}")
    print("✓ Object still alive - ref2 keeps it in memory")

    print("\nDelete ref2 (last reference)")
    ref2 = None
    print("✓ Now the object is destroyed")


# Lifetimes
def example_2() -> None:
    def create_container():
        data_ref = Data(100)
        container = {"stored": data_ref}

        return container

    result = create_container()

    # In C, 'data_ref' would be freed when the function returns
    # In Python, it lives on because container holds a reference
    print(f"\nAccessing data after function returned: {result['stored'].value}")
    print("✓ No use-after-free - garbage collector tracks all references")


example_1()
example_2()
