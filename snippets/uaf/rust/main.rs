/**
 * Rust: Use-After-Free Prevention
 *
 * In C, you can free memory but still have pointers to it.
 * Rust's borrow checker prevents this at compile time.
 */
fn main() {
    example1();
    example2();
    example3();
    example4();
}

fn example1() {
    // Example 1: Can't use value after move
    println!("Ownership");
    let data = String::from("Hello");
    let moved = data; // Ownership transfers to 'moved'

    // println!("{}", data); // Won't compile: "value borrowed here after move"
    println!("{}", moved); // This is ok, moved owns it
    println!("✓ Can't access data after ownership moves");
}

fn example2() {
    // Example 2: References can't outlive the data
    println!("\nLifetimes");

    // let reference;
    // {
    //     let value = String::from("temporary");
    //     reference = &value; // Won't compile: "value does not live long enough"
    //     println!("value exists: {}", value);
    // }
    // println!("{}", reference); // value is dropped, reference would be dangling

    // println!("✓ Compiler prevents dangling references");
}

fn example3() {
    // Example 3: Mutable reference prevents other access
    println!("\nExclusive mutable access");
    #[allow(unused_mut)]
    {
        let mut count = 0;

        // {
        //     let count_ref = &count; // Won't compile: can't have other refs
        //     let mutable_ref = &mut count;
        //     *mutable_ref += 1;

        //     println!("{}", count_ref);
        // }

        println!("count = {}", count);
        println!("✓ Mutable reference has exclusive access");
    }
}

fn example4() {
    // Example 4: Correct pattern with references
    println!("\nCorrect usage");

    fn process(text: &str) -> usize {
        text.len()
    }

    let message = String::from("Hello, Rust!");
    let length = process(&message); // Borrow, don't move

    println!("Message: {}", message); // Still valid
    println!("Length: {}", length);
    println!("✓ Borrowing allows safe, temporary access");
}
