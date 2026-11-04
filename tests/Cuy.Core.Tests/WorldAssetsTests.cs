using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    /// <summary>
    /// Contract tests: world art, tiles, crops, portraits and icons referenced by game data exist on disk
    /// with the expected sprite sizes. Reads the real repo files; changes nothing.
    /// </summary>
    public class WorldAssetsTests
    {
        private static readonly string[] FloorTiles =
        {
            "floor_wood", "floor_straw", "floor_fleece", "floor_grass", "floor_soil", "floor_stone"
        };

        private static JObject LoadJson(string relativePath)
        {
            return JObject.Parse(File.ReadAllText(RepoFile.Find(relativePath)));
        }

        /// <summary>Width and height from the IHDR chunk (bytes 16..23, big-endian).</summary>
        private static (int Width, int Height) ReadPngSize(string path)
        {
            byte[] bytes = File.ReadAllBytes(path);
            Assert.True(bytes.Length >= 24, path + " is too short to be a PNG");
            byte[] signature = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
            Assert.True(bytes.Take(8).SequenceEqual(signature), path + " is not a PNG");
            return (ReadBigEndian(bytes, 16), ReadBigEndian(bytes, 20));
        }

        private static int ReadBigEndian(byte[] bytes, int offset)
        {
            return (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
        }

        private static int[] ReadPair(JToken token)
        {
            return token.ToObject<int[]>();
        }

        private static string FindPortrait(string id)
        {
            foreach (string name in new[] { id + "_32.png", id + ".png" })
            {
                string path = RepoFile.Find("assets/sprites/portraits/" + name);
                if (File.Exists(path)) return path;
            }
            return null;
        }

        [Fact]
        public void NamedPigs_EveryIdHasSquarePortraitPng()
        {
            var root = LoadJson("assets/data/pigs_named.json");
            var ids = ((JArray)root["pigs"]).Select(p => (string)p["id"]).ToList();
            Assert.NotEmpty(ids);

            var missing = new List<string>();
            foreach (string id in ids)
            {
                string path = FindPortrait(id);
                if (path == null)
                {
                    missing.Add(id);
                    continue;
                }
                var size = ReadPngSize(path);
                Assert.True(size.Width > 0 && size.Width == size.Height,
                    id + " portrait is " + size.Width + "x" + size.Height);
            }
            Assert.Empty(missing);
        }

        [Fact]
        public void WorldItems_HaveAtlasEntryWithTileSizedBoundsInsideTheirPng()
        {
            var worldItems = (JArray)LoadJson("assets/data/world_items.json")["items"];
            var atlasItems = (JObject)LoadJson("assets/world/atlas.json")["items"];

            var problems = new List<string>();
            foreach (var item in worldItems)
            {
                string id = (string)item["id"];
                var entry = atlasItems[id] as JObject;
                if (entry == null)
                {
                    problems.Add(id + ": no atlas entry");
                    continue;
                }

                int[] size = ReadPair(entry["size"]);
                int[] cells = ReadPair(entry["cells"]);
                if (size[0] != cells[0] * 16 || size[1] != cells[1] * 16)
                {
                    problems.Add(id + ": size " + size[0] + "x" + size[1] + " is not cells*16");
                    continue;
                }

                string png = RepoFile.Find("assets/world/" + (string)entry["file"]);
                if (!File.Exists(png))
                {
                    problems.Add(id + ": missing " + (string)entry["file"]);
                    continue;
                }
                var pngSize = ReadPngSize(png);
                if (pngSize.Width != size[0] || pngSize.Height != size[1])
                {
                    problems.Add(id + ": png " + pngSize.Width + "x" + pngSize.Height + " != " + size[0] + "x" + size[1]);
                }
            }
            Assert.Empty(problems);
        }

        [Fact]
        public void Crops_HaveFarmFramesAndIconItems()
        {
            var crops = (JArray)LoadJson("assets/data/farm.json")["crops"];
            var farmAtlas = LoadJson("assets/world/farm/farm.json");
            var frames = (JObject)farmAtlas["frames"];
            int[] atlasSize = ReadPair(farmAtlas["size"]);
            var icons = (JObject)LoadJson("assets/icons/icons.json")["icons"];
            string farmPng = RepoFile.Find("assets/world/farm/farm.png");
            Assert.True(File.Exists(farmPng), "farm.png is missing");
            var pngSize = ReadPngSize(farmPng);
            Assert.Equal(atlasSize[0], pngSize.Width);
            Assert.Equal(atlasSize[1], pngSize.Height);

            var problems = new List<string>();
            foreach (var crop in crops)
            {
                string id = (string)crop["id"];
                bool perennial = string.Equals((string)crop["kind"], "perennial", StringComparison.OrdinalIgnoreCase);

                // Annual crops use frames "crop_<id>" (4 frames, 16x16 at 1x = 32x32 in farm_x2.png).
                // Perennial crops are trees drawn as "tree_<id>" (16x32 frames).
                string key = "crop_" + id;
                int expectedFrames = 4;
                int expectedH = 16;
                if (frames[key] == null && perennial)
                {
                    key = "tree_" + id;
                    expectedFrames = 1;
                    expectedH = 32;
                }

                var frameList = frames[key] as JArray;
                if (frameList == null || frameList.Count < expectedFrames)
                {
                    problems.Add(id + ": no frames " + key);
                }
                else
                {
                    foreach (var f in frameList)
                    {
                        int[] r = ReadPair(f);
                        if (r[2] != 16 || r[3] != expectedH)
                            problems.Add(id + ": frame " + r[2] + "x" + r[3] + " in " + key);
                        if (r[0] < 0 || r[1] < 0 || r[0] + r[2] > atlasSize[0] || r[1] + r[3] > atlasSize[1])
                            problems.Add(id + ": frame outside farm.png in " + key);
                    }
                    if (!perennial && frameList.Count != expectedFrames)
                        problems.Add(id + ": " + frameList.Count + " frames in " + key);
                }

                string item = (string)crop["item"];
                if (!icons.ContainsKey(item)) problems.Add(id + ": item " + item + " not in icons.json");
            }
            Assert.Empty(problems);
        }

        [Fact]
        public void FloorTiles_ExistInTilesWithSixteenPixelFrames()
        {
            var root = LoadJson("assets/world/tiles.json");
            var tiles = (JObject)root["tiles"];

            var problems = new List<string>();
            foreach (string name in FloorTiles)
            {
                var entry = tiles[name] as JObject;
                if (entry == null)
                {
                    problems.Add(name + ": not in tiles.json");
                    continue;
                }
                int[] size = ReadPair(entry["size"]);
                if (size[0] != 16 || size[1] != 16)
                    problems.Add(name + ": size " + size[0] + "x" + size[1]);

                string png = RepoFile.Find("assets/world/" + (string)entry["file"]);
                if (!File.Exists(png))
                {
                    problems.Add(name + ": missing " + (string)entry["file"]);
                    continue;
                }
                var pngSize = ReadPngSize(png);
                if (pngSize.Width != 16 || pngSize.Height != 16)
                    problems.Add(name + ": png " + pngSize.Width + "x" + pngSize.Height);
            }
            Assert.Empty(problems);
        }

        [Fact]
        public void WorldAndPlaceIcons_ExistInIconsJson()
        {
            var icons = (JObject)LoadJson("assets/icons/icons.json")["icons"];

            var referenced = new List<string>();
            referenced.AddRange(LoadJson("assets/data/world_items.json").SelectTokens("$..icon").Select(t => (string)t));
            referenced.AddRange(LoadJson("assets/data/places.json").SelectTokens("$..icon").Select(t => (string)t));

            var missing = referenced
                .Where(name => string.IsNullOrEmpty(name) || !icons.ContainsKey(name))
                .Distinct()
                .ToList();
            Assert.Empty(missing);
        }
    }
}
