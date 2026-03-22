use chrono::NaiveDateTime;
use std::fs::File;
use std::io::BufReader;
use std::path::Path;

/// Extract the earliest available EXIF datetime from a file.
/// Tries DateTimeOriginal → DateTimeDigitized → DateTime in that order.
pub fn get_exif_datetime(path: &Path) -> Option<NaiveDateTime> {
    let file = File::open(path).ok()?;
    let mut reader = BufReader::new(file);
    let exif_reader = exif::Reader::new();
    let exif = exif_reader.read_from_container(&mut reader).ok()?;

    let tags = [
        exif::Tag::DateTimeOriginal,
        exif::Tag::DateTimeDigitized,
        exif::Tag::DateTime,
    ];

    for tag in &tags {
        if let Some(field) = exif.get_field(*tag, exif::In::PRIMARY) {
            if let exif::Value::Ascii(ref vecs) = field.value {
                if let Some(bytes) = vecs.first() {
                    if let Ok(s) = std::str::from_utf8(bytes) {
                        if let Ok(dt) =
                            NaiveDateTime::parse_from_str(s.trim(), "%Y:%m:%d %H:%M:%S")
                        {
                            return Some(dt);
                        }
                    }
                }
            }
        }
    }

    None
}
