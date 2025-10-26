/**
 * Rust: Lifetime Annotations
 *
 * Lifetimes tell Rust how long references are valid.
 * They prevent dangling references at compile time.
 */
fn main() {
    example1();
    example2();
    example3();

    println!("\nFailing Example (commented out)");
    println!(
        "Uncomment example4() to see the compiler error: `'string2' does not live long enough`"
    );
    // example4();
}

fn example1() {
    // Example 1: Workings, result used within both lifetimes
    println!("Example 1 (Works)");

    let string1 = String::from("short");
    let string2 = String::from("long string");

    let result = longest(&string1, &string2);
    println!("The longest string is: {}", result);
    println!("✓ Both string1 and string2 are still alive here");
}

fn example2() {
    // Example 2: Workings, result used before string2 is dropped
    println!("\nExample 2 (Works)");

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

fn example3() {
    // Example 3: Workings, demonstrate taking and returning ownership
    println!("\nExample 3 (Works)");

    let mut s = String::from("hi");
    println!("s Stack address: {:p}", &s);
    println!("s Heap address: {:p}", s.as_ptr());
    s = take_and_return(s); // move ownership in, then back out

    println!("s Stack address: {:p}", &s);
    println!("s Heap address: {:p}", s.as_ptr());
    println!("{}", s);
}

fn take_and_return(s2: String) -> String {
    println!("{}", s2);
    println!("s2 Stack address: {:p}", &s2);
    println!("s2 Heap address: {:p}", s2.as_ptr());
    s2 // return ownership back
}

// // Uncomment to see the compile error:
// fn example4() {
//     // Example 4: Fails, result used after reference drops
//     println!("\nExample 4 (Fails)");

//     let string1 = String::from("short");
//     let result;
//     {
//         let string2 = String::from("long string");
//         // result = longest_no_lifetimes(&string1, &string2);
//         result = longest(&string1, &string2);
//         println!("fails()");
//         // string2 is dropped here - but result points to it!
//     }
//     // ERROR: result points to the dropped string2
//     println!("{}", result);
// }

// /**
//  * Without lifetime annotations, this won't compile:
//  * Error: "expected named lifetime parameter"
//  * Rust can't determine how long the returned reference should live.
//  */
// fn longest_no_lifetimes(x: &str, y: &str) -> &str {
//     if x.len() > y.len() { x } else { y }
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
