#!/usr/bin/env python3
"""Unattended Windows STS2 build and resource validation, Python 3.10+.

Copies the project to a unique run directory, uses installed game references,
builds C#, exports and mounts PCK with the matching MegaDot, then calls the actual
game ModManager in an isolated Godot host. Full game startup and gameplay remain untested.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time
import traceback
import urllib.request
import uuid
import xml.etree.ElementTree as ET
import zipfile

from inspect_mod import inspect

DOWNLOAD_ROOT = "https://megadot.megacrit.com"
SKIP = {".git", ".godot", ".idea", ".vs", "bin", "obj", "artifacts",
        "node_modules", "__pycache__"}
ENGINE_ERROR = re.compile(r"(?im)^\s*(?:ERROR:|SCRIPT ERROR:|Parse Error:)|Export failed")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig")


def save_json(path: Path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def run(command, directory: Path, log: Path, timeout=300) -> str:
    """Use argument arrays, drain output to disk, and stop the child tree on timeout."""
    environment = dict(os.environ, DOTNET_CLI_UI_LANGUAGE="en", MSBUILDDISABLENODEREUSE="1")
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    with log.open("w", encoding="utf-8") as stream:
        child = subprocess.Popen([str(arg) for arg in command], cwd=directory,
                                 stdout=stream, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
                                 env=environment, creationflags=flags)
        try:
            code = child.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            if os.name == "nt":
                subprocess.run(["taskkill", "/PID", str(child.pid), "/T", "/F"],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                               creationflags=flags, timeout=15, check=False)
            else:
                child.kill()
            child.wait(timeout=15)
            raise RuntimeError(f"Timed out after {timeout}s. See {log}") from None
    output = log.read_text(encoding="utf-8", errors="replace")
    if code != 0:
        raise RuntimeError(f"Exit {code}. See {log}\n{output[-6000:]}")
    return output


def discover_game(explicit: Path | None) -> Path:
    candidates = [explicit] if explicit else []
    if os.environ.get("STS2_GAME_DIR"):
        candidates.append(Path(os.environ["STS2_GAME_DIR"]))
    steam_roots = []
    if os.name == "nt":
        import winreg
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam") as key:
                steam_roots.append(Path(winreg.QueryValueEx(key, "SteamPath")[0]))
        except OSError:
            pass
    for base in (os.environ.get("PROGRAMFILES(X86)"), os.environ.get("PROGRAMFILES")):
        if base:
            steam_roots.append(Path(base) / "Steam")
    for steam in list(steam_roots):
        library = steam / "steamapps/libraryfolders.vdf"
        if library.is_file():
            steam_roots.extend(Path(p.replace("\\\\", "\\")) for p in
                               re.findall(r'"path"\s+"([^"\n]+)"', read_text(library)))
    candidates.extend(p / "steamapps/common/Slay the Spire 2" for p in steam_roots)
    for candidate in candidates:
        if candidate and (candidate / "data_sts2_windows_x86_64/sts2.dll").is_file():
            return candidate.resolve()
    raise RuntimeError("Installed STS2 not found in Steam libraries. Set STS2_GAME_DIR or --game.")


def download_editor(version: str, cache: Path) -> Path:
    """Cache a versioned official download, verified against its published SHA256."""
    tool = cache / "tools" / version
    installed = tool / "installed.json"
    if installed.is_file():
        executable = tool / json.loads(read_text(installed))["executable"]
        if executable.is_file():
            return executable
    tool.mkdir(parents=True, exist_ok=True)
    name = f"megadot-{version}-windows-x86_64-llvm-editor-csharp.zip"
    url = f"{DOWNLOAD_ROOT}/{version}/{name}"
    with urllib.request.urlopen(url + ".sha256", timeout=30) as response:
        expected = response.read().decode().split()[0].lower()
    if not re.fullmatch(r"[0-9a-f]{64}", expected):
        raise RuntimeError("Invalid MegaDot checksum response")
    archive = tool / name
    if not archive.is_file() or sha256(archive) != expected:
        print(f"Downloading matching MegaDot {version} (cached for subsequent runs)", flush=True)
        partial = tool / f"{uuid.uuid4().hex}.partial"
        try:
            with urllib.request.urlopen(url, timeout=60) as response, partial.open("wb") as target:
                shutil.copyfileobj(response, target)
            actual = sha256(partial)
            if actual != expected:
                raise RuntimeError("MegaDot SHA256 mismatch")
            os.replace(partial, archive)
        finally:
            partial.unlink(missing_ok=True)
    with tempfile.TemporaryDirectory(prefix="extract-", dir=tool) as temp:
        with zipfile.ZipFile(archive) as package:
            for item in package.infolist():
                destination = (Path(temp) / item.filename).resolve()
                if not destination.is_relative_to(Path(temp).resolve()):
                    raise RuntimeError("Unexpected path in MegaDot archive")
            package.extractall(temp, members=[item for item in package.infolist()
                                             if not item.filename.endswith(".pdb")])
        executables = list(Path(temp).rglob("*mono_win64_console.exe"))
        if len(executables) != 1:
            raise RuntimeError("MegaDot console executable missing from archive")
        relative = executables[0].relative_to(temp)
        # The run lock serializes installation and prevents partially extracted cache reuse.
        shutil.copytree(temp, tool, dirs_exist_ok=True)
    save_json(installed, {"executable": str(relative), "sha256": expected})
    return tool / relative


def copy_project(source: Path, destination: Path):
    def ignore(directory, names):
        return [name for name in names if name in SKIP or name.startswith(".env")
                or (Path(directory) / name).is_symlink()]
    shutil.copytree(source, destination, ignore=ignore)


def choose_preset(path: Path) -> str:
    presets = []
    for block in re.split(r"(?m)^\[preset\.\d+\]\s*$", read_text(path))[1:]:
        properties = block.split("[", 1)[0]
        name = re.search(r'(?m)^name="(.*)"', properties)
        platform = re.search(r'(?m)^platform="(.*)"', properties)
        if name and platform and platform[1] == "Windows Desktop":
            presets.append(name[1])
    if len(presets) != 1:
        raise RuntimeError("Expected one Windows Desktop export preset. Supply --preset for multiple presets.")
    return presets[0]


def stage_dependencies(manifest: dict, packages: Path, game: Path, seen=None):
    seen = set() if seen is None else seen
    for entry in manifest.get("dependencies", []):
        mod_id = entry if isinstance(entry, str) else entry.get("id", "")
        if not re.fullmatch(r"[A-Za-z0-9_.-]+", mod_id) or mod_id in {".", ".."}:
            raise RuntimeError(f"Invalid dependency id {mod_id!r}")
        if mod_id in seen:
            continue
        seen.add(mod_id)
        destination = packages / mod_id
        dependency_manifest = destination / f"{mod_id}.json"
        if not dependency_manifest.is_file():
            roots = [game / "mods", game.parents[1] / "workshop/content/2868840"]
            matches = []
            for root in roots:
                if root.is_dir():
                    for candidate in root.rglob("*.json"):
                        if candidate.name not in {f"{mod_id}.json", "mod_manifest.json"}:
                            continue
                        try:
                            if json.loads(read_text(candidate)).get("id") == mod_id:
                                matches.append(candidate)
                        except (ValueError, OSError):
                            continue
            if len(matches) != 1:
                raise RuntimeError(f"Expected one installed dependency {mod_id}, found {len(matches)}")
            shutil.copytree(matches[0].parent, destination, dirs_exist_ok=True)
            dependency_manifest = destination / matches[0].name
        stage_dependencies(json.loads(read_text(dependency_manifest)), packages, game, seen)


def verify_loader(engine: Path, dotnet: str, game: Path, packages: Path,
                  mod_id: str, run_dir: Path):
    probe = run_dir / "loader"
    probe.mkdir()
    shutil.copy2(Path(__file__).with_name("LoaderProbe.cs"), probe / "LoaderProbe.cs")
    project = ET.Element("Project", Sdk="Godot.NET.Sdk/4.5.1")
    properties = ET.SubElement(project, "PropertyGroup")
    ET.SubElement(properties, "TargetFramework").text = "net9.0"
    ET.SubElement(properties, "EnableDynamicLoading").text = "true"
    references = ET.SubElement(project, "ItemGroup")
    for name in ("sts2", "0Harmony"):
        reference = ET.SubElement(references, "Reference", Include=name)
        ET.SubElement(reference, "HintPath").text = str(game / "data_sts2_windows_x86_64" / f"{name}.dll")
    ET.ElementTree(project).write(probe / "LoaderProbe.csproj", encoding="utf-8")
    (probe / "project.godot").write_text('config_version=5\n[application]\nconfig/name="SpireFactoryLoaderProbe"\nrun/main_scene="res://probe.tscn"\n[dotnet]\nproject/assembly_name="LoaderProbe"\n', encoding="utf-8")
    (probe / "probe.tscn").write_text('[gd_scene load_steps=2 format=3]\n[ext_resource type="Script" path="res://LoaderProbe.cs" id="1"]\n[node name="LoaderProbe" type="Node"]\nscript = ExtResource("1")\n', encoding="utf-8")
    run([dotnet, "build", probe / "LoaderProbe.csproj", "--nologo", "-v:minimal"], probe, run_dir / "loader-build.log")
    version = json.loads(read_text(game / "release_info.json"))["version"]
    output = run([engine, "--headless", "--path", probe, "--", game, packages, mod_id, version], probe, run_dir / "loader.log", 60)
    if f"SPIRE_FACTORY_LOADER_OK {mod_id}" not in output or ENGINE_ERROR.search(output):
        raise RuntimeError(f"Isolated mod initialization failed. See {run_dir / 'loader.log'}")


def verify(args, report: dict, run_dir: Path, cache: Path):
    source = args.project.resolve()
    project_files = list(source.glob("*.csproj"))
    if len(project_files) != 1:
        raise RuntimeError("Expected exactly one root .csproj in the supplied mod directory")
    game = discover_game(args.game)
    game_libs = game / "data_sts2_windows_x86_64"
    report["game"] = json.loads(read_text(game / "release_info.json"))
    report["gamePath"] = str(game)
    source_inventory = inspect(source)
    save_json(run_dir / "inventory.json", source_inventory)
    report["warnings"] = source_inventory["warnings"]
    if source_inventory["errors"]:
        raise RuntimeError(f"Static validation failed. See {run_dir / 'inventory.json'}")
    work = run_dir / "project"
    copy_project(source, work)
    csproj = work / project_files[0].name
    # Old templates keep stale copies of game dependencies inside libs/.
    for reference in ET.parse(csproj).iter("HintPath"):
        hint = (reference.text or "").replace("\\", "/")
        if "$" in hint:
            continue
        destination = (work / hint).resolve()
        if destination.is_relative_to(work) and destination.name in {"sts2.dll", "0Harmony.dll", "GodotSharp.dll"}:
            destination.parent.mkdir(parents=True, exist_ok=True)
            replacement = destination.with_suffix(".dll.new")
            shutil.copy2(game_libs / destination.name, replacement)
            os.replace(replacement, destination)
    packages = run_dir / "mods"
    packages.mkdir()
    properties = [f"-p:Sts2Path={game}", f"-p:Sts2DataDir={game_libs}",
                  f"-p:SteamLibraryPath={game.parent.parent}", f"-p:ModsPath={packages.as_posix()}/",
                  "-p:IsInnerGodotExport=true", "-p:UseSharedCompilation=false"]
    dotnet = shutil.which("dotnet")
    if not dotnet:
        raise RuntimeError(".NET SDK missing. Install the SDK required by the project TargetFramework.")
    report["stage"] = "compile"
    run([dotnet, "build", csproj, "--nologo", "-v:minimal", *properties], work, run_dir / "compile.log")
    report["checks"]["compile"] = "passed"

    # Ask MSBuild for evaluated output names instead of guessing Godot's output layout.
    evaluated = run([dotnet, "msbuild", csproj, "-nologo", "-getProperty:TargetPath,AssemblyName", *properties],
                    work, run_dir / "properties.log")
    values = json.loads(evaluated)["Properties"]
    assembly_name = values["AssemblyName"]
    output = Path(values["TargetPath"])
    manifest_file = work / f"{assembly_name}.json"
    manifest = json.loads(read_text(manifest_file)) if manifest_file.is_file() else None
    mod_dir = packages / assembly_name
    mod_dir.mkdir(exist_ok=True)
    if not output.is_file():
        raise RuntimeError(f"Build reported success but DLL is missing: {output}")
    shutil.copy2(output, mod_dir / f"{assembly_name}.dll")
    if manifest is not None:
        shutil.copy2(manifest_file, mod_dir / manifest_file.name)

    report["stage"] = "export"
    version_output = run([game / "SlayTheSpire2.exe", "--version"], game, run_dir / "game-version.log", 30)
    match = re.search(r"(\d+\.\d+\.\d+)\.m\.(\d+)", version_output)
    if not match:
        raise RuntimeError("Cannot identify installed MegaDot version. See game-version.log")
    version = f"{match[1]}-m.{match[2]}"
    engine = args.godot.resolve() if args.godot else download_editor(version, cache)
    report["engine"] = str(engine)
    engine_version = run([engine, "--version"], work, run_dir / "engine-version.log", 30)
    if f"{match[1]}.m.{match[2]}.mono" not in engine_version:
        raise RuntimeError(f"Editor must match installed game engine {version} Mono")
    needs_pack = manifest is None or manifest.get("has_pck", False)
    if needs_pack:
        preset = args.preset or choose_preset(work / "export_presets.cfg")
        pack = mod_dir / f"{assembly_name}.pck"
        # Always export directly so an MSBuild WarnAndContinue cannot hide failures.
        pack.unlink(missing_ok=True)
        exported = run([engine, "--headless", "--path", work, "--export-pack", preset, pack],
                       work, run_dir / "export.log")
        if ENGINE_ERROR.search(exported) or not pack.is_file() or pack.stat().st_size < 16:
            raise RuntimeError(f"PCK export failed. See {run_dir / 'export.log'}")
        report["checks"]["export"] = "passed"
        report["stage"] = "pack_load"
        probe = run_dir / "probe"
        probe.mkdir()
        (probe / "project.godot").write_text('config_version=5\n[application]\nconfig/name="SpireFactoryVerification"\n', encoding="utf-8")
        shutil.copy2(Path(__file__).with_name("verify_pack.gd"), probe / "verify_pack.gd")
        loaded = run([engine, "--headless", "--path", probe, "--script", "verify_pack.gd", "--", pack],
                     probe, run_dir / "pack-load.log", 60)
        if "SPIRE_FACTORY_PACK_OK" not in loaded or ENGINE_ERROR.search(loaded):
            raise RuntimeError(f"PCK mount/read failed. See {run_dir / 'pack-load.log'}")
        report["checks"]["pack_load"] = "passed"
    else:
        report["checks"].update(export="not_required", pack_load="not_required")

    report["stage"] = "manifest"
    if manifest is None:
        raise RuntimeError(f"Missing {assembly_name}.json. The game requires a mod manifest.")
    if manifest.get("id") != assembly_name or manifest.get("has_dll") is not True:
        raise RuntimeError("Manifest id must match the built DLL name and has_dll must be true for this C# mod.")
    report["checks"]["manifest"] = "passed"
    report["stage"] = "loader"
    stage_dependencies(manifest, packages, game)
    verify_loader(engine, dotnet, game, packages, assembly_name, run_dir)
    report["checks"]["loader"] = "passed"
    report["artifacts"] = str(mod_dir)
    report["status"] = "passed"
    report["stage"] = "complete"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", type=Path)
    parser.add_argument("--game", type=Path)
    parser.add_argument("--godot", type=Path)
    parser.add_argument("--preset")
    parser.add_argument("--cache", type=Path, default=Path(os.environ.get("LOCALAPPDATA", tempfile.gettempdir())) / "SpireFactory/verification")
    args = parser.parse_args()
    if os.name != "nt":
        parser.error("This verifier currently supports Windows installations")
    cache = args.cache.resolve()
    cache.mkdir(parents=True, exist_ok=True)
    run_dir = cache / "runs" / uuid.uuid4().hex
    run_dir.mkdir(parents=True)
    report = {"status": "failed", "stage": "prepare", "project": str(args.project.resolve()),
              "checks": {"compile": "not_run", "export": "not_run", "pack_load": "not_run", "manifest": "not_run",
                         "loader": "not_run", "game_startup": "not_run", "gameplay": "not_run"},
              "runDirectory": str(run_dir)}
    started = time.monotonic()
    # OS lock releases even if the process crashes. Serialize tool installation and builds.
    import msvcrt
    with (cache / "verify.lock").open("a+b") as lock:
        lock.seek(0)
        lock.write(b"0")
        lock.flush()
        while True:
            try:
                lock.seek(0)
                msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
                break
            except OSError:
                time.sleep(1)
        try:
            verify(args, report, run_dir, cache)
        except Exception as error:
            report["error"] = str(error)
            if report["stage"] in report["checks"]:
                report["checks"][report["stage"]] = "failed"
            (run_dir / "failure.log").write_text(traceback.format_exc(), encoding="utf-8")
        finally:
            lock.seek(0)
            msvcrt.locking(lock.fileno(), msvcrt.LK_UNLCK, 1)
    report["seconds"] = round(time.monotonic() - started, 2)
    save_json(run_dir / "report.json", report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())
