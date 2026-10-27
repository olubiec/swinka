using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;

namespace Cuy.Core.Care
{
    public static class CareData
    {
        private static readonly object _syncLock = new object();
        private static CareDataRoot _current;

        public static CareDataRoot Current
        {
            get
            {
                if (_current != null) return _current;
                lock (_syncLock)
                {
                    if (_current == null)
                    {
                        _current = LoadDefault();
                    }
                }
                return _current;
            }
            set
            {
                lock (_syncLock)
                {
                    _current = value;
                }
            }
        }

        public static CareDataRoot Load(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
                return CreateDefault();

            CareDataRoot root = null;
            try
            {
                var settings = new JsonSerializerSettings
                {
                    ContractResolver = new DefaultContractResolver
                    {
                        NamingStrategy = new SnakeCaseNamingStrategy()
                    }
                };
                root = JsonConvert.DeserializeObject<CareDataRoot>(json, settings);
            }
            catch (Exception ex)
            {
                ItemCatalog.ErrorLogger?.Invoke($"CareData: Error parsing JSON: {ex.Message}");
                return CreateDefault();
            }

            if (root == null)
            {
                return CreateDefault();
            }

            if (root.Tasks == null)
            {
                root.Tasks = new List<CareTaskDefinition>();
            }

            if (root.WeightAlert == null)
            {
                root.WeightAlert = new WeightAlertSettings { DropGrams = 50, DropPercent = 5 };
            }

            if (root.SnoozeMinutes == null || root.SnoozeMinutes.Count == 0)
            {
                root.SnoozeMinutes = new List<int> { 15, 60, 180 };
            }

            var validTasks = new List<CareTaskDefinition>();
            foreach (var t in root.Tasks)
            {
                if (string.IsNullOrWhiteSpace(t.Id))
                {
                    ItemCatalog.ErrorLogger?.Invoke("CareData: Dropped task with empty id.");
                    continue;
                }

                if (t.Schedule != "daily" && t.Schedule != "weekly" && t.Schedule != "every_n_days")
                {
                    ItemCatalog.ErrorLogger?.Invoke($"CareData: Dropped task '{t.Id}' with unknown schedule '{t.Schedule}'.");
                    continue;
                }

                validTasks.Add(t);
            }
            root.Tasks = validTasks;

            return root;
        }

        private static CareDataRoot CreateDefault()
        {
            return new CareDataRoot
            {
                Tasks = new List<CareTaskDefinition>(),
                WeightAlert = new WeightAlertSettings { DropGrams = 50, DropPercent = 5 },
                SnoozeMinutes = new List<int> { 15, 60, 180 }
            };
        }

        public static CareDataRoot LoadFromFile(string filePath)
        {
            if (!File.Exists(filePath))
                throw new FileNotFoundException("care.json not found", filePath);
            string json = File.ReadAllText(filePath);
            return Load(json);
        }

        public static CareDataRoot LoadDefault()
        {
            // 1. Check the file system
            string baseDir = AppDomain.CurrentDomain.BaseDirectory ?? Directory.GetCurrentDirectory();
            string[] candidatePaths = new[]
            {
                Path.Combine(baseDir, "assets", "data", "care.json"),
                Path.Combine(baseDir, "care.json"),
                Path.Combine(baseDir, "..", "assets", "data", "care.json"),
                Path.Combine(baseDir, "..", "..", "assets", "data", "care.json"),
                Path.Combine(baseDir, "..", "..", "..", "assets", "data", "care.json"),
                Path.Combine(baseDir, "..", "..", "..", "..", "assets", "data", "care.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "assets", "data", "care.json")
            };

            foreach (var path in candidatePaths)
            {
                try
                {
                    string fullPath = Path.GetFullPath(path);
                    if (File.Exists(fullPath))
                    {
                        return LoadFromFile(fullPath);
                    }
                }
                catch { }
            }

            // 2. Check embedded resources
            var asm = typeof(CareData).GetTypeInfo().Assembly;
            foreach (var resName in asm.GetManifestResourceNames())
            {
                if (resName.EndsWith("care.json", StringComparison.OrdinalIgnoreCase))
                {
                    using (var stream = asm.GetManifestResourceStream(resName))
                    {
                        if (stream != null)
                        {
                            using (var reader = new StreamReader(stream))
                            {
                                return Load(reader.ReadToEnd());
                            }
                        }
                    }
                }
            }

            // 3. Fallback to code defaults
            ItemCatalog.ErrorLogger?.Invoke("CareData: care.json not found, using hardcoded defaults.");
            return CreateDefault();
        }
    }
}
