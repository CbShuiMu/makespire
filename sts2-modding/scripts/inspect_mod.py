#!/usr/bin/env python3
"""Read-only STS2 project inventory. Python 3.10+, standard library only.

Does not run MSBuild, evaluate its properties, read secrets, or validate C# APIs.
Exit 1: malformed JSON/XML or definite manifest inconsistency; 2: invalid input.
Warnings (including a missing manifest) do not imply failure.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

SKIP = {'.git', '.godot', '.idea', '.vs', 'bin', 'obj', 'node_modules',
        'libs', 'artifacts', 'publish', 'dist', '__pycache__'}
PROPS = {'TargetFramework', 'TargetFrameworks', 'AssemblyName', 'RootNamespace',
         'GodotPath', 'Sts2Path', 'Sts2DataDir', 'ModsPath', 'Publicize', 'LangVersion'}


def files_under(root: Path):
    for current, dirs, files in os.walk(root, followlinks=False):
        dirs[:] = sorted(d for d in dirs if d.lower() not in SKIP
                         and not (Path(current) / d).is_symlink()
                         and (Path(current) / d).resolve().is_relative_to(root))
        for name in sorted(files):
            path = Path(current) / name
            if not path.is_symlink() and path.resolve().is_relative_to(root):
                yield path


def inspect(root: Path) -> dict:
    report = {'root': str(root), 'projects': [], 'build_files': [], 'manifests': [],
              'localization_files': 0, 'source_files': 0, 'errors': [], 'warnings': [],
              'limits': 'Static inventory only; MSBuild properties, API compatibility, '
                        'resource completeness and runtime loading are not evaluated.'}
    paths = list(files_under(root))

    def error(path, message):
        report['errors'].append({'path': str(path.relative_to(root)), 'message': message})

    for path in paths:
        relative = path.relative_to(root)
        if path.suffix.lower() == '.cs':
            report['source_files'] += 1
        if path.suffix.lower() in {'.csproj', '.props', '.targets'}:
            try:
                tree = ET.parse(path).getroot()
            except (ET.ParseError, OSError) as exc:
                error(path, str(exc))
                continue
            data = {'path': str(relative), 'sdk': tree.get('Sdk'), 'properties': [],
                    'packages': [], 'references': [], 'imports': [], 'targets': []}
            for item in tree.iter():
                tag = item.tag.rsplit('}', 1)[-1]
                if tag in PROPS:
                    data['properties'].append({'name': tag, 'value': item.text,
                                               'condition': item.get('Condition')})
                elif tag == 'PackageReference':
                    data['packages'].append(dict(item.attrib))
                elif tag == 'Reference':
                    data['references'].append({'include': item.get('Include'),
                        'metadata': {c.tag.rsplit('}', 1)[-1]: c.text for c in item}})
                elif tag == 'Import':
                    data['imports'].append(dict(item.attrib))
                elif tag == 'Target':
                    operations = [{'kind': c.tag.rsplit('}', 1)[-1], **c.attrib}
                                  for c in item.iter()
                                  if c.tag.rsplit('}', 1)[-1] in {'Copy', 'Exec', 'WriteLinesToFile'}]
                    data['targets'].append({'attributes': dict(item.attrib),
                                            'operations': operations})
            key = 'projects' if path.suffix.lower() == '.csproj' else 'build_files'
            report[key].append(data)
        # Only root-level manifest candidates and localization JSON; no settings/logs.
        is_loc = 'localization' in {p.lower() for p in relative.parts[:-1]}
        if path.suffix.lower() != '.json' or not (path.parent == root or is_loc):
            continue
        if path.name.lower() in {'package.json', 'package-lock.json', 'global.json'}:
            continue
        duplicates = []

        def pairs_hook(pairs):
            obj = {}
            for key, value in pairs:
                if key in obj:
                    duplicates.append(key)
                obj[key] = value
            return obj

        try:
            obj = json.loads(path.read_text(encoding='utf-8-sig'), object_pairs_hook=pairs_hook)
        except (OSError, UnicodeError, ValueError) as exc:
            error(path, str(exc))
            continue
        if duplicates:
            error(path, 'Duplicate JSON keys: ' + ', '.join(sorted(set(duplicates))))
        if is_loc:
            report['localization_files'] += 1
            if not isinstance(obj, dict):
                error(path, 'Localization JSON must be an object.')
        if path.parent == root and isinstance(obj, dict) and 'id' in obj and (
                'has_dll' in obj or 'has_pck' in obj):
            report['manifests'].append({'path': str(relative), **{k: obj.get(k) for k in
                ('id', 'version', 'has_dll', 'has_pck', 'dependencies', 'affects_gameplay', 'min_game_version')}})
            if obj['id'] != path.stem:
                error(path, 'Manifest filename must match its id.')
            for key in ('has_dll', 'has_pck', 'affects_gameplay'):
                if key in obj and not isinstance(obj[key], bool):
                    error(path, key + ' must be boolean.')
            if 'dependencies' in obj and not isinstance(obj['dependencies'], list):
                error(path, 'dependencies must be an array; validate entries against the game version.')

    if not report['projects']:
        report['warnings'].append('No .csproj found; check that the project root was selected.')
    if not report['manifests']:
        report['warnings'].append('No root manifest found; legacy template or alternate layout needs review.')
    packages = [p.get('Include', '') for f in report['projects'] + report['build_files']
                for p in f['packages']]
    if 'Alchyr.Sts2.BaseLib' not in packages:
        report['warnings'].append('No explicit BaseLib PackageReference found; inspect DLL references/imported configuration.')
    if any(t['operations'] for f in report['projects'] + report['build_files'] for t in f['targets']):
        report['warnings'].append('Build targets contain file writes or process execution; inspect destinations before building.')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('project', type=Path, help='Mod project directory, not the game/data root')
    args = parser.parse_args()
    root = args.project.expanduser().resolve()
    if not root.is_dir():
        parser.error('Project directory does not exist: ' + str(root))
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    result = inspect(root)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if result['errors'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
