/// 扩展工具命令（cftunnel + ClawApp）
use serde_json::Value;
use std::process::Command;

/// 解析 cftunnel status 输出
fn parse_cftunnel_status(output: &str) -> serde_json::Map<String, Value> {
    let mut map = serde_json::Map::new();
    for line in output.lines() {
        let line = line.trim();
        if line.starts_with("隧道:") || line.starts_with("隧道：") {
            let rest = line.splitn(2, ':').nth(1).unwrap_or("").trim();
            // "mac-home (uuid)" → 取名称
            let name = rest.split('(').next().unwrap_or(rest).trim();
            map.insert("tunnel_name".into(), Value::String(name.to_string()));
        } else if line.starts_with("状态:") || line.starts_with("状态：") {
            let rest = line.splitn(2, ':').nth(1).unwrap_or("").trim();
            let running = rest.contains("运行中");
            map.insert("running".into(), Value::Bool(running));
            // 提取 PID
            if let Some(pid_str) = rest.split("PID:").nth(1) {
                let pid = pid_str.trim().trim_end_matches(')').trim();
                if let Ok(p) = pid.parse::<u64>() {
                    map.insert("pid".into(), Value::Number(p.into()));
                }
            }
        }
    }
    map
}

/// 解析 cftunnel list 输出为路由数组
fn parse_cftunnel_routes(output: &str) -> Vec<Value> {
    let mut routes = Vec::new();
    for line in output.lines() {
        let line = line.trim();
        // 跳过表头行
        if line.is_empty() || line.starts_with("名称") || line.starts_with("---") {
            continue;
        }
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 3 {
            let mut obj = serde_json::Map::new();
            obj.insert("name".into(), Value::String(parts[0].to_string()));
            obj.insert("domain".into(), Value::String(parts[1].to_string()));
            obj.insert("service".into(), Value::String(parts[2].to_string()));
            routes.push(Value::Object(obj));
        }
    }
    routes
}

fn cftunnel_bin() -> String {
    // 优先查找用户 bin 目录
    let home = dirs::home_dir().unwrap_or_default();
    let user_bin = home.join("bin").join("cftunnel");
    if user_bin.exists() {
        return user_bin.to_string_lossy().to_string();
    }
    "cftunnel".to_string()
}

#[tauri::command]
pub fn get_cftunnel_status() -> Result<Value, String> {
    let bin = cftunnel_bin();
    let mut result = serde_json::Map::new();

    // 检查是否安装
    let version_out = Command::new(&bin).arg("version").output();
    match version_out {
        Ok(out) => {
            let ver = String::from_utf8_lossy(&out.stdout).trim().to_string();
            result.insert("installed".into(), Value::Bool(true));
            result.insert("version".into(), Value::String(ver));
        }
        Err(_) => {
            result.insert("installed".into(), Value::Bool(false));
            return Ok(Value::Object(result));
        }
    }

    // 获取状态
    if let Ok(out) = Command::new(&bin).arg("status").output() {
        let text = String::from_utf8_lossy(&out.stdout);
        let status = parse_cftunnel_status(&text);
        for (k, v) in status {
            result.insert(k, v);
        }
    }

    // 获取路由列表
    if let Ok(out) = Command::new(&bin).arg("list").output() {
        let text = String::from_utf8_lossy(&out.stdout);
        let routes = parse_cftunnel_routes(&text);
        result.insert("routes".into(), Value::Array(routes));
    }

    Ok(Value::Object(result))
}

#[tauri::command]
pub fn cftunnel_action(action: String) -> Result<(), String> {
    let bin = cftunnel_bin();
    match action.as_str() {
        "up" | "down" => {}
        _ => return Err(format!("不支持的操作: {action}")),
    }
    let output = Command::new(&bin)
        .arg(&action)
        .output()
        .map_err(|e| format!("执行 cftunnel {action} 失败: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("cftunnel {action} 失败: {stderr}"));
    }
    Ok(())
}

#[tauri::command]
pub fn get_cftunnel_logs(lines: Option<u32>) -> Result<String, String> {
    let bin = cftunnel_bin();
    let n = lines.unwrap_or(20).to_string();
    let output = Command::new(&bin)
        .args(["logs", "--tail", &n])
        .output()
        .map_err(|e| format!("读取 cftunnel 日志失败: {e}"))?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
pub fn get_clawapp_status() -> Result<Value, String> {
    let mut result = serde_json::Map::new();

    // 用 lsof 检测 :3210 端口
    let output = Command::new("lsof")
        .args(["-i", ":3210", "-P", "-t"])
        .output();

    match output {
        Ok(out) => {
            let text = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if text.is_empty() {
                result.insert("running".into(), Value::Bool(false));
            } else {
                result.insert("running".into(), Value::Bool(true));
                if let Ok(pid) = text.lines().next().unwrap_or("").parse::<u64>() {
                    result.insert("pid".into(), Value::Number(pid.into()));
                }
            }
        }
        Err(_) => {
            result.insert("running".into(), Value::Bool(false));
        }
    }

    result.insert("port".into(), Value::Number(3210.into()));
    result.insert("url".into(), Value::String("http://localhost:3210".into()));
    Ok(Value::Object(result))
}
