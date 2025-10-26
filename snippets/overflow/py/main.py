"""
Python: Buffer Overflow Prevention

In C, you can write past the end of an array and corrupt adjacent memory.
Python has bounds checking.
"""


# Example 1: Lists have bounds checking
def example_1() -> None:
    print("Lists")
    numbers = [1, 2, 3]
    numbers[0] = 99
    print(f"Changed first element: {numbers}")

    # This raises IndexError - can't write past the end
    try:
        numbers[10] = 999
    except IndexError as e:
        print(f"✓ Prevented overflow: {e}")


# Example 2: Strings are immutable
def example_2() -> None:
    print("\nStrings")
    password = "secret"

    # Can't modify a string in place in Python
    # password[6] = "x"  # Would raise TypeError

    # You create a new string instead
    password = password + "extra"
    print(f"New string created: {password}")
    print("✓ Original memory unchanged - no overflow")


# Example 3: Objects store attributes separately
def example_3() -> None:
    print("\nObjects")

    class Config:
        def __init__(self):
            self.name = "A" * 5  # 5 characters
            self.flag = False

    config = Config()
    print(f"Before: name='{config.name}', flag={config.flag}")

    # Overwrite name with huge string
    config.name = "B" * 1000

    print(f"After:  name length={len(config.name)}, flag={config.flag}")
    print("✓ flag is untouched - attributes are independent objects")


example_1()
example_2()
example_3()
