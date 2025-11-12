/**
 * Rust: Lifetime Annotations
 *
 * Lifetimes tell Rust how long references are valid.
 * They prevent dangling references at compile time.
 */
fn main() {
    // === Example 1: Working case - result used within both lifetimes ===
    println!("=== Working Example 1 ===");
    works();

    // === Example 2: Working case - result used before string2 is dropped ===
    println!("\n=== Working Example 2 ===");
    works2();

    // === Example 3: Failing case - result used after reference dies ===
    println!("\n=== Failing Example (commented out) ===");
    println!("Uncomment fails() to see the compiler error:");
    println!("'string2' does not live long enough");
    // fails();

    // === Example 4 ===
    let mut s = String::from("hi");
    println!("s Stack address: {:p}", &s);
    println!("s Heap address: {:p}", s.as_ptr());
    s = take_and_return(s); // move ownership in, then back out

    println!("s Stack address: {:p}", &s);
    println!("s Heap address: {:p}", s.as_ptr());
    println!("{}", s);
}

fn works() {
    let string1 = String::from("short");
    let string2 = String::from("long string");

    let result = longest(&string1, &string2);
    println!("The longest string is: {}", result);
    println!("✓ Both string1 and string2 are still alive here");
}

fn works2() {
    let string1 = String::from("short");
    let result;
    {
        let string2 = String::from("long string");
        result = longest(&string1, &string2);
        println!("The longest string is: {}", result);
        println!("✓ result used BEFORE string2 is dropped - this is OK!");
        // string2 is dropped here, but we're done using result
    }
}

// // Uncomment to see the compile error:
// fn fails() {
//     let string1 = String::from("short");
//     let result;
//     {
//         let string2 = String::from("long string");
//         result = longest(&string1, &string2);
//         println!("fails()");
//         // string2 is dropped here - but result points to it!
//     }
//     // ERROR: result points to the dropped string2
//     println!("{}", result);
// }

/**
 * The lifetime annotation 'a means:
 * "The returned reference is valid for as long as BOTH x AND y are valid"
 *
 * Rust enforces that result can only be used while both inputs are alive.
 */
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}

// // Without lifetime annotations, this won't compile:
// fn longest_no_lifetimes(x: &str, y: &str) -> &str {
//     if x.len() > y.len() { x } else { y }
// }
// // Error: "expected named lifetime parameter"
// // Rust can't determine how long the returned reference should live.

fn take_and_return(s2: String) -> String {
    println!("{}", s2);
    println!("s2 Stack address: {:p}", &s2);
    println!("s2 Heap address: {:p}", s2.as_ptr());
    s2 // return ownership back
}
