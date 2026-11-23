use std::{collections::HashSet, fs, io::Write, path::Path};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tempfile::NamedTempFile;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("文件读写失败：{0}")]
    Io(#[from] std::io::Error),
    #[error("JSON 格式错误：{0}")]
    Json(#[from] serde_json::Error),
    #[error("{0}")]
    Invalid(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workshop {
    #[serde(default = "schema_version")]
    pub schema_version: u32,
    pub projects: Vec<Value>,
    pub items: Vec<Value>,
}

fn schema_version() -> u32 {
    1
}

impl Workshop {
    pub fn validate(&self) -> Result<(), StorageError> {
        if self.schema_version != 1 {
            return Err(StorageError::Invalid("工作空间文件版本不受支持".into()));
        }
        let mut project_ids = HashSet::new();
        for project in &self.projects {
            validate_record(project, &mut project_ids)?;
            if !project["tags"].is_array() {
                return Err(StorageError::Invalid("项目 tags 必须是数组".into()));
            }
        }
        let mut item_ids = HashSet::new();
        for item in &self.items {
            validate_record(item, &mut item_ids)?;
            if !matches!(
                item["kind"].as_str(),
                Some("characters" | "cards" | "relics" | "potions")
            ) {
                return Err(StorageError::Invalid("作品类型无效".into()));
            }
            let project_id = item["projectId"]
                .as_str()
                .ok_or_else(|| StorageError::Invalid("作品缺少所属项目字段".into()))?;
            if !project_id.is_empty() && !project_ids.contains(project_id) {
                return Err(StorageError::Invalid("作品引用的项目不存在".into()));
            }
        }
        Ok(())
    }
}

fn validate_record<'a>(record: &'a Value, ids: &mut HashSet<&'a str>) -> Result<(), StorageError> {
    for field in ["id", "name", "description", "status"] {
        if !record[field].is_string() {
            return Err(StorageError::Invalid(format!("记录缺少文本字段 {field}")));
        }
    }
    let id = record["id"].as_str().unwrap_or_default();
    if id.is_empty() || !ids.insert(id) {
        return Err(StorageError::Invalid("文件包含空 ID 或重复 ID".into()));
    }
    Ok(())
}

pub fn read_workshop(path: &Path) -> Result<Option<Workshop>, StorageError> {
    let bytes = match fs::read(path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error.into()),
    };
    let data: Workshop = serde_json::from_slice(&bytes)?;
    data.validate()?;
    Ok(Some(data))
}

pub fn write_json(path: &Path, value: &impl Serialize) -> Result<(), StorageError> {
    let directory = path
        .parent()
        .ok_or_else(|| StorageError::Invalid("文件路径无效".into()))?;
    fs::create_dir_all(directory)?;
    // Replace only after the complete document has been written and flushed.
    let mut temporary = NamedTempFile::new_in(directory)?;
    serde_json::to_writer_pretty(&mut temporary, value)?;
    temporary.write_all(b"\n")?;
    temporary.as_file().sync_all()?;
    temporary
        .persist(path)
        .map_err(|error| StorageError::Io(error.error))?;
    Ok(())
}

pub fn write_workshop(path: &Path, data: &Workshop) -> Result<(), StorageError> {
    data.validate()?;
    if path.exists() {
        // A malformed existing file is left intact for manual recovery.
        let previous = read_workshop(path)?;
        if let Some(previous) = previous {
            write_json(&path.with_extension("backup.json"), &previous)?;
        }
    }
    write_json(path, data)
}

pub fn parse_import(bytes: &[u8]) -> Result<Workshop, StorageError> {
    let mut value: Value = serde_json::from_slice(bytes)?;
    if let Some(project) = value.get("project").cloned() {
        value["projects"] = Value::Array(vec![project]);
    }
    let data: Workshop = serde_json::from_value(value)?;
    data.validate()?;
    Ok(data)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn sample() -> Workshop {
        Workshop {
            schema_version: 1,
            projects: vec![
                json!({"id":"p1","name":"项目","description":"","status":"进行中","tags":[]}),
            ],
            items: vec![],
        }
    }

    #[test]
    fn save_replaces_document_and_keeps_previous_backup() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("workshop.json");
        write_workshop(&path, &sample()).unwrap();
        let mut changed = sample();
        changed.projects[0]["name"] = json!("已修改");
        write_workshop(&path, &changed).unwrap();
        assert_eq!(
            read_workshop(&path).unwrap().unwrap().projects[0]["name"],
            "已修改"
        );
        assert_eq!(
            read_workshop(&path.with_extension("backup.json"))
                .unwrap()
                .unwrap()
                .projects[0]["name"],
            "项目"
        );
    }

    #[test]
    fn malformed_existing_file_is_preserved() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("workshop.json");
        fs::write(&path, b"broken json").unwrap();
        assert!(write_workshop(&path, &sample()).is_err());
        assert_eq!(fs::read(&path).unwrap(), b"broken json");
    }

    #[test]
    fn imports_legacy_project_export_and_preserves_extra_fields() {
        let data = parse_import(br#"{"schemaVersion":1,"project":{"id":"p","name":"old","description":"","status":"draft","tags":[],"custom":123},"items":[]}"#).unwrap();
        assert_eq!(data.projects[0]["custom"], 123);
    }

    #[test]
    fn rejects_unknown_item_types_and_duplicate_ids() {
        let mut data = sample();
        data.projects.push(data.projects[0].clone());
        assert!(data.validate().is_err());
        data.projects.pop();
        data.items.push(json!({"id":"i","name":"x","description":"","status":"draft","kind":"unknown","projectId":"p1"}));
        assert!(data.validate().is_err());
    }
}
