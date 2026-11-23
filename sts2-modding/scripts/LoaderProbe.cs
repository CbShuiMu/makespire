using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.Loader;
using System.Threading.Tasks;
using Godot;
using MegaCrit.Sts2.Core.Debug;
using MegaCrit.Sts2.Core.Modding;

public partial class LoaderProbe : Node
{
    public override async void _Ready()
    {
        try
        {
            var args = OS.GetCmdlineUserArgs();
            var gameDirectory = args[0];
            var modsDirectory = args[1];
            var modId = args[2];
            var loadContext = AssemblyLoadContext.GetLoadContext(Assembly.GetExecutingAssembly())!;
            loadContext.Resolving += (context, name) =>
            {
                var dependency = Path.Combine(gameDirectory, "data_sts2_windows_x86_64", name.Name + ".dll");
                if (File.Exists(dependency))
                    return context.LoadFromAssemblyPath(dependency);
                var modDependency = Directory.EnumerateFiles(modsDirectory, name.Name + ".dll", SearchOption.AllDirectories).FirstOrDefault();
                return modDependency == null ? null : context.LoadFromAssemblyPath(modDependency);
            };
            await RunLoader(gameDirectory, modsDirectory, modId, args[3]);
        }
        catch (Exception error)
        {
            GD.PushError(error.ToString());
            GetTree().Quit(1);
        }
    }

    // Keep the loader in a separate method so dependency resolution is installed before JIT.
    private async Task RunLoader(string gameDirectory, string modsDirectory, string modId, string version)
    {
        if (!ProjectSettings.LoadResourcePack(Path.Combine(gameDirectory, "SlayTheSpire2.pck")))
            throw new InvalidOperationException("Cannot mount installed game resources");
        var settings = new ModSettings { PlayerAgreedToModLoading = true };
        settings.ModList.Add(new SettingsSaveMod { Id = modId, IsEnabled = true, Source = ModSource.ModsDirectory });
        await ModManager.Initialize(new ProbeFileIo(modsDirectory), settings, SemanticVersion.FromString(version));
        var mod = ModManager.Mods.SingleOrDefault(candidate => candidate.manifest?.id == modId);
        if (mod == null || mod.state != ModLoadState.Loaded || mod.errors?.Count > 0)
            throw new InvalidOperationException($"Mod loader rejected {modId}. Inspect preceding loader errors.");
        var failedDependency = ModManager.Mods.FirstOrDefault(candidate =>
            candidate.state != ModLoadState.Loaded || candidate.errors?.Count > 0);
        if (failedDependency != null)
            throw new InvalidOperationException($"Dependency initialization failed: {failedDependency.manifest?.id}");
        GD.Print("SPIRE_FACTORY_LOADER_OK " + modId);
        GetTree().Quit(0);
    }

    private sealed class ProbeFileIo(string modsDirectory) : IModManagerFileIo
    {
        private readonly string virtualRoot = Path.Combine(Path.GetDirectoryName(OS.GetExecutablePath())!, "mods");
        public bool DirectoryExists(string path) => path == virtualRoot || Directory.Exists(path);
        public bool FileExists(string path) => File.Exists(path);
        public string[] GetFilesAt(string path) => path == virtualRoot ? [] : Directory.GetFiles(path);
        public string[] GetDirectoriesAt(string path) => path == virtualRoot ? [modsDirectory] : Directory.GetDirectories(path);
        public Stream OpenStream(string path, Godot.FileAccess.ModeFlags mode) => File.OpenRead(path);
        public void MakeDirRecursive(string path) => throw new InvalidOperationException("Loader probe requested an unexpected filesystem write");
        public Error CopyFile(string sourcePath, string destinationPath) => Error.Unavailable;
    }
}
