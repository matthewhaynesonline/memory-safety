/**
 * Rust: Buffer Overflow Prevention
 *
 * In C, you can write past array bounds and corrupt memory.
 * Rust checks bounds at runtime or uses growable types.
 */
fn main() {
    example1();
    example2();
    example3();
    example4();
}

fn example1() {
    // Example 1: Arrays have bounds checking
    println!("Fixed-size arrays");
    let mut buffer = [0u8; 5];

    buffer[0] = 65; // OK
    buffer[4] = 69; // OK, last element
    println!("Buffer: {:?}", buffer);

    // buffer[10] = 88; // Won't compile: "index out of bounds"

    // With runtime index, it panics:
    // #[allow(unconditional_panic)]
    // {
    //     let index = 10;
    //     buffer[index] = 88; // This would panic: "index out of bounds"
    // }

    println!("✓ Rust checks bounds, out of bounds access won't compile or will panic");
}

fn example2() {
    // Example 2: Use Vec for dynamic sizing
    println!("\nGrowable Vec");
    let mut data = vec![1, 2, 3];

    // Safe ways to add elements, Vec grows automatically
    data.push(4);
    data.push(5);
    println!("Vec: {:?}", data);
    println!("✓ No overflow, Vec expands as needed");
}

fn example3() {
    // Example 3: Safe copying with slices
    println!("\nSafe copying");
    let source = [1, 2, 3, 4, 5, 6, 7, 8];
    let mut dest = [0; 5];

    // Try to copy without checking, this would panic
    // dest.copy_from_slice(&source);
    // Panics: "source slice length (8) does not match destination slice length (5)"
    // println!("Can't copy 8 elements into array of 5, Rust prevents this");

    // Safe way: Copy only what fits
    let to_copy = source.len().min(dest.len());
    dest[..to_copy].copy_from_slice(&source[..to_copy]);

    println!("Copied {} elements into dest", to_copy);
    println!("dest: {:?}", dest);
    println!("✓ copy_from_slice checks lengths, panics if mismatch");
}

fn example4() {
    // Example 4: String prevents buffer overflow
    println!("\nString type");
    let mut password = String::from("secret");

    // Can append without worrying about buffer size
    password.push_str("extralongstringthatwontoverflow");

    println!("Password length: {}", password.len());
    println!("✓ String grows automatically, no fixed buffer to overflow");
}
