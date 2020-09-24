use wasm_bindgen::prelude::wasm_bindgen;

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    return a + b;
}

#[wasm_bindgen]
pub fn hello(name: String) -> String {
    return format!("hello {}", name);
}


#[test]
fn test_add() {
    println!("{}", add(1_i32, 2_i32));
}

#[test]
fn test_hello() {
    println!("{}", hello("Jackie".into()));
}
