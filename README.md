# Memory Safety

This project is meant to demonstrate memory safety issues.

## Video guide

https://youtu.be/kN6AtVm7b3w

## Example App

https://matthewhaynesonline.github.io/memory-safety/

## `c_example`

This is a simple web server written in `C` to demonstrate [overflow](https://en.wikipedia.org/wiki/Buffer_overflow) and [dangling pointer / use after free](https://en.wikipedia.org/wiki/Dangling_pointer) issues.

**NOTE: this code has actual vulnerabilities and shouldn't be used. It's just for illustrative purposes.**

## `memory_visualizer`

This is a companion app written with `Svelte` (JS) to visualize the memory issues from the `c_example`.

**NOTE: since this app is for demonstration purposes, the code for it isn't refactored or polished, rather just a tool to get the job done.**

## `snippets`

Simple snippets from Python and Rust that demonstrates how those languages handle overflows and dangling pointers (as well as lifetime annotations for Rust).
