use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ServiceStatus {
    pub label: String,
    pub pid: Option<u32>,
    pub running: bool,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VersionInfo {
    pub current: Option<String>,
    pub latest: Option<String>,
    pub update_available: bool,
    pub source: String,
}
