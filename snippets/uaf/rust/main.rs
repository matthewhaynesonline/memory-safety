/**
 * Rust: Use-After-Free Prevention
 *
 * In C, you can free memory but still have pointers to it.
 * Rust's borrow checker prevents this at compile time.
 */
fn main() {
    // === Example 1: Can't use value after move ===
    println!("=== Ownership ===");
    let data = String::from("Hello");
    let moved = data; // Ownership transfers to 'moved'

    // println!("{}", data); // Won't compile: "value borrowed here after move"
    println!("{}", moved); // OK - moved owns it
    println!("✓ Can't access data after ownership moves");

    // === Example 2: References can't outlive the data ===
    println!("\n=== Lifetimes ===");

    // let reference;
    // {
    //     let value = String::from("temporary");
    //     reference = &value; // Won't compile: "value does not live long enough"
    //     println!("value exists: {}", value);
    // }
    // println!("{}", reference); // value is dropped, reference would be dangling

    // println!("✓ Compiler prevents dangling references");

    // === Example 3: Mutable reference prevents other access ===
    println!("\n=== Exclusive mutable access ===");
    #[allow(unused_mut)]
    {
        let mut count = 0;

        // {
        //     let count_ref = &count; // Won't compile: can't have other refs
        //     let mutable_ref = &mut count;
        //     *mutable_ref += 1;

        //     println!("{}", count_ref);
        // }

        println!("count = {}", count); // OK now
        println!("✓ Mutable reference has exclusive access");
    }

    // === Example 4: Correct pattern with references ===
    println!("\n=== Correct usage ===");

    fn process(text: &str) -> usize {
        text.len()
    }

    let message = String::from("Hello, Rust!");
    let length = process(&message); // Borrow, don't move

    println!("Message: {}", message); // Still valid!
    println!("Length: {}", length);
    println!("✓ Borrowing allows safe, temporary access");
}
