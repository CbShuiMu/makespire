#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if let Err(error) = spire_factory_lib::run() {
        eprintln!("Spire Factory failed to start: {error}");
        std::process::exit(1);
    }
}
