use std::net::TcpListener;

/// Scan a port range and return the first available port.
/// Returns `None` if every port in the range is occupied.
pub fn find_available_port(start: u16, end: u16) -> Option<u16> {
    (start..=end).find(|&port| is_port_available(port))
}

/// True if the given port can be bound on 127.0.0.1.
pub fn is_port_available(port: u16) -> bool {
    TcpListener::bind(("127.0.0.1", port)).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_a_port_in_range() {
        let port = find_available_port(8000, 8099);
        assert!(port.is_some());
        assert!((8000..=8099).contains(&port.unwrap()));
    }
}
