using System;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json.Linq;
using Cuy.Core;

namespace Cuy.Core.World
{
    /// <summary>
    /// Data-driven configuration for the garden run (assets/data/pig_run.json).
    /// </summary>
    public sealed class RunConfig
    {
        private static readonly object _syncLock = new object();
        private static RunConfig _current;

        public static RunConfig Current
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
        }

        public int MinCells { get; set; } = 12;
        public int CellsPerPig { get; set; } = 6;
        public string GateItem { get; set; } = "gate_garden";
        public IReadOnlyList<string> Blockers { get; set; } = new[] { "fence_wood", "hedge", "gate_garden" };
        public int MaxHoursPerDay { get; set; } = 6;
        public int DayFromHour { get; set; } = 8;
        public int DayToHour { get; set; } = 19;
        public int MinTempC { get; set; } = 10;
        public int MaxTempC { get; set; } = 28;
        public IReadOnlyList<string> AllowedConditions { get; set; } = new[] { "Clear", "Cloudy" };
        public double MoodPerHour { get; set; } = 1.0;
        public int MoodCapPerDay { get; set; } = 6;

        public static RunConfig CreateDefault() => new RunConfig();

        public static RunConfig LoadDefault()
        {
            string[] starts = { AppContext.BaseDirectory, Directory.GetCurrentDirectory() };
            foreach (var start in starts)
            {
                if (string.IsNullOrEmpty(start)) continue;
                var dir = new DirectoryInfo(start);
                for (int depth = 0; dir != null && depth < 8; depth++, dir = dir.Parent)
                {
                    string path = Path.Combine(dir.FullName, "assets", "data", "pig_run.json");
                    if (!File.Exists(path)) continue;
                    try
                    {
                        return Load(File.ReadAllText(path));
                    }
                    catch (Exception ex)
                    {
                        Log($"could not read {path} ({ex.Message}), using code defaults.");
                        return CreateDefault();
                    }
                }
            }

            Log("pig_run.json not found, using code defaults.");
            return CreateDefault();
        }

        public static RunConfig Load(string json)
        {
            var cfg = CreateDefault();
            if (string.IsNullOrWhiteSpace(json))
            {
                Log("empty JSON, using code defaults.");
                return cfg;
            }

            JObject root;
            try
            {
                root = JObject.Parse(json);
            }
            catch (Exception ex)
            {
                Log($"bad JSON ({ex.Message}), using code defaults.");
                return cfg;
            }

            cfg.MinCells = Math.Max(1, ReadInt(root, "min_cells", cfg.MinCells));
            cfg.CellsPerPig = Math.Max(1, ReadInt(root, "cells_per_pig", cfg.CellsPerPig));
            cfg.GateItem = ReadStr(root, "gate_item", cfg.GateItem);
            cfg.Blockers = ReadStrList(root, "blockers", cfg.Blockers);
            cfg.MaxHoursPerDay = Math.Max(0, ReadInt(root, "max_hours_per_day", cfg.MaxHoursPerDay));
            cfg.DayFromHour = Clamp(ReadInt(root, "day_from_hour", cfg.DayFromHour), 0, 23);
            cfg.DayToHour = Clamp(ReadInt(root, "day_to_hour", cfg.DayToHour), 0, 24);
            cfg.MinTempC = ReadInt(root, "min_temp_c", cfg.MinTempC);
            cfg.MaxTempC = ReadInt(root, "max_temp_c", cfg.MaxTempC);
            cfg.AllowedConditions = ReadStrList(root, "allowed_conditions", cfg.AllowedConditions);
            cfg.MoodPerHour = Math.Max(0.0, ReadDouble(root, "mood_per_hour", cfg.MoodPerHour));
            cfg.MoodCapPerDay = Math.Max(0, ReadInt(root, "mood_cap_per_day", cfg.MoodCapPerDay));
            return cfg;
        }

        private static int ReadInt(JObject root, string key, int fallback)
        {
            var tok = root[key];
            if (tok == null || tok.Type == JTokenType.Null) return fallback;
            try { return tok.Value<int>(); }
            catch { return fallback; }
        }

        private static double ReadDouble(JObject root, string key, double fallback)
        {
            var tok = root[key];
            if (tok == null || tok.Type == JTokenType.Null) return fallback;
            try { return tok.Value<double>(); }
            catch { return fallback; }
        }

        private static string ReadStr(JObject root, string key, string fallback)
        {
            var tok = root[key];
            if (tok == null || tok.Type != JTokenType.String) return fallback;
            var s = tok.Value<string>();
            return string.IsNullOrWhiteSpace(s) ? fallback : s.Trim();
        }

        private static IReadOnlyList<string> ReadStrList(JObject root, string key, IReadOnlyList<string> fallback)
        {
            var arr = root[key] as JArray;
            if (arr == null) return fallback;
            var list = new List<string>();
            foreach (var item in arr)
            {
                if (item.Type == JTokenType.String)
                {
                    var s = item.Value<string>();
                    if (!string.IsNullOrWhiteSpace(s))
                        list.Add(s.Trim());
                }
            }
            return list.Count > 0 ? list : fallback;
        }

        private static int Clamp(int v, int min, int max) => v < min ? min : (v > max ? max : v);

        private static void Log(string msg)
        {
            try { ItemCatalog.ErrorLogger?.Invoke("[RunConfig] " + msg); }
            catch { /* logging must never throw */ }
        }
    }

    public sealed class RunInfo
    {
        public bool Valid { get; set; }
        public int Cells { get; set; }
        public int Capacity { get; set; }
        public bool HasGate { get; set; }
        public string Reason { get; set; } = "no_fence";
        public IReadOnlyList<(int x, int y)> CellList { get; set; } = Array.Empty<(int x, int y)>();
    }

    /// <summary>
    /// Detects a fenced garden run and computes its cell count and pig capacity.
    /// </summary>
    public static class RunCheck
    {
        public static bool IsFenced(RoomLayout garden, int cols = 16, int rows = 9, WorldItemCatalog items = null, RunConfig cfg = null)
        {
            return Analyze(garden, cols, rows, items, cfg).Valid;
        }

        public static int Capacity(RoomLayout garden, int cols = 16, int rows = 9, WorldItemCatalog items = null, RunConfig cfg = null)
        {
            return Analyze(garden, cols, rows, items, cfg).Capacity;
        }

        public static RunInfo Analyze(RoomLayout garden, int cols, int rows, WorldItemCatalog items = null, RunConfig cfg = null)
        {
            var config = cfg ?? RunConfig.Current;
            if (garden == null || garden.Items == null || garden.Items.Count == 0 || cols <= 0 || rows <= 0)
            {
                return EmptyNoFence();
            }

            var blockerSet = new HashSet<string>(config.Blockers ?? Array.Empty<string>(), StringComparer.OrdinalIgnoreCase);
            var gateId = config.GateItem ?? "gate_garden";
            var catalog = items ?? WorldItemCatalog.Current;

            bool[,] blocked = new bool[cols, rows];
            bool[,] isGate = new bool[cols, rows];
            bool anyBlocker = false;

            foreach (var placed in garden.Items)
            {
                if (placed == null || string.IsNullOrEmpty(placed.ItemId)) continue;
                bool isBlocker = blockerSet.Contains(placed.ItemId);
                bool isGateItem = string.Equals(placed.ItemId, gateId, StringComparison.OrdinalIgnoreCase);
                if (!isBlocker && !isGateItem) continue;

                int fw = 1;
                int fh = 1;
                if (catalog != null && catalog.TryGet(placed.ItemId, out var def) && def != null)
                {
                    fw = Math.Max(1, def.EffectiveFootW);
                    fh = Math.Max(1, def.EffectiveFootH);
                }

                for (int dx = 0; dx < fw; dx++)
                {
                    for (int dy = 0; dy < fh; dy++)
                    {
                        int cx = placed.X + dx;
                        int cy = placed.Y + dy;
                        if (cx < 0 || cx >= cols || cy < 0 || cy >= rows) continue;
                        if (isBlocker)
                        {
                            blocked[cx, cy] = true;
                            anyBlocker = true;
                        }
                        if (isGateItem)
                        {
                            isGate[cx, cy] = true;
                        }
                    }
                }
            }

            if (!anyBlocker)
            {
                return EmptyNoFence();
            }

            bool[,] visited = new bool[cols, rows];
            List<(int x, int y)> bestCells = null;
            var queue = new Queue<(int x, int y)>();
            int[] dxs = { 1, -1, 0, 0 };
            int[] dys = { 0, 0, 1, -1 };

            for (int y = 0; y < rows; y++)
            {
                for (int x = 0; x < cols; x++)
                {
                    if (blocked[x, y] || visited[x, y]) continue;

                    var comp = new List<(int x, int y)>();
                    bool touchesEdge = false;
                    visited[x, y] = true;
                    queue.Enqueue((x, y));

                    while (queue.Count > 0)
                    {
                        var cur = queue.Dequeue();
                        comp.Add(cur);
                        if (cur.x == 0 || cur.x == cols - 1 || cur.y == 0 || cur.y == rows - 1)
                        {
                            touchesEdge = true;
                        }

                        for (int dir = 0; dir < 4; dir++)
                        {
                            int nx = cur.x + dxs[dir];
                            int ny = cur.y + dys[dir];
                            if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
                            if (blocked[nx, ny] || visited[nx, ny]) continue;
                            visited[nx, ny] = true;
                            queue.Enqueue((nx, ny));
                        }
                    }

                    if (touchesEdge) continue;

                    comp.Sort(CompareCells);
                    if (bestCells == null || comp.Count > bestCells.Count ||
                        (comp.Count == bestCells.Count && CompareCells(comp[0], bestCells[0]) < 0))
                    {
                        bestCells = comp;
                    }
                }
            }

            if (bestCells == null || bestCells.Count == 0)
            {
                return new RunInfo
                {
                    Valid = false,
                    Cells = 0,
                    Capacity = 0,
                    HasGate = false,
                    Reason = "open_edge",
                    CellList = Array.Empty<(int x, int y)>()
                };
            }

            int count = bestCells.Count;
            if (count < config.MinCells)
            {
                return new RunInfo
                {
                    Valid = false,
                    Cells = count,
                    Capacity = 0,
                    HasGate = false,
                    Reason = "too_small",
                    CellList = bestCells
                };
            }

            bool hasGate = false;
            foreach (var cell in bestCells)
            {
                for (int dir = 0; dir < 4; dir++)
                {
                    int nx = cell.x + dxs[dir];
                    int ny = cell.y + dys[dir];
                    if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && isGate[nx, ny])
                    {
                        hasGate = true;
                        break;
                    }
                }
                if (hasGate) break;
            }

            if (!hasGate)
            {
                return new RunInfo
                {
                    Valid = false,
                    Cells = count,
                    Capacity = 0,
                    HasGate = false,
                    Reason = "no_gate",
                    CellList = bestCells
                };
            }

            int capacity = Math.Max(1, count / Math.Max(1, config.CellsPerPig));
            return new RunInfo
            {
                Valid = true,
                Cells = count,
                Capacity = capacity,
                HasGate = true,
                Reason = "ok",
                CellList = bestCells
            };
        }

        private static int CompareCells((int x, int y) a, (int x, int y) b)
        {
            int cy = a.y.CompareTo(b.y);
            return cy != 0 ? cy : a.x.CompareTo(b.x);
        }

        private static RunInfo EmptyNoFence()
        {
            return new RunInfo
            {
                Valid = false,
                Cells = 0,
                Capacity = 0,
                HasGate = false,
                Reason = "no_fence",
                CellList = Array.Empty<(int x, int y)>()
            };
        }
    }
}
