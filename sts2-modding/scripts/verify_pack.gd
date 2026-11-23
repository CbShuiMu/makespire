extends SceneTree

# Read the exported pack in a fresh engine so stale import caches cannot satisfy checks.
func _initialize():
	var arguments = OS.get_cmdline_user_args()
	if arguments.size() != 1 or not ProjectSettings.load_resource_pack(arguments[0]):
		push_error("Cannot mount exported PCK")
		quit(1)
		return
	if not check_directory("res://"):
		quit(1)
		return
	print("SPIRE_FACTORY_PACK_OK")
	quit(0)

func check_directory(path: String) -> bool:
	var directory = DirAccess.open(path)
	if directory == null:
		push_error("Cannot read directory " + path)
		return false
	directory.include_hidden = true
	for folder in directory.get_directories():
		if not check_directory(path.path_join(folder)):
			return false
	for name in directory.get_files():
		var file_path = path.path_join(name)
		var file = FileAccess.open(file_path, FileAccess.READ)
		if file == null:
			push_error("Cannot read packed file " + file_path)
			return false
		if name.ends_with(".json"):
			var document = JSON.new()
			if document.parse(file.get_as_text()) != OK:
				push_error("Invalid packed JSON " + file_path)
				return false
		else:
			while file.get_position() < file.get_length():
				var data = file.get_buffer(mini(1048576, file.get_length() - file.get_position()))
				if data.is_empty():
					push_error("Cannot read packed data " + file_path)
					return false
	return true
