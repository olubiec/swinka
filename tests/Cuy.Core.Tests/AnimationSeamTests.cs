using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Xml.Linq;
using Xunit;

namespace Cuy.Core.Tests
{
    public class AnimationSeamTests
    {
        private static readonly XNamespace Ns = "https://esheep.petrucci.ch/";

        private static string RepoFile(string relativePath)
        {
            var dir = AppContext.BaseDirectory;
            while (dir != null && !File.Exists(Path.Combine(dir, "Cuy.sln")))
            {
                dir = Directory.GetParent(dir)?.FullName;
            }
            if (dir == null)
            {
                throw new InvalidOperationException("Could not find Cuy.sln repository root.");
            }
            return Path.Combine(dir, relativePath);
        }

        // D3.2: when one animation hands over to another (sequence, border or gravity next), the foot offset must not jump.
        [Fact]
        public void EveryTransition_KeepsFootOffsetWithinTwoPixels()
        {
            XDocument doc = XDocument.Load(RepoFile("src/Cuy/Resources/animations.xml"));
            List<XElement> animations = doc.Descendants(Ns + "animation").ToList();
            var startOffset = new Dictionary<int, double>();
            var endOffset = new Dictionary<int, double>();
            var names = new Dictionary<int, string>();
            foreach (XElement a in animations)
            {
                int id = (int)a.Attribute("id");
                startOffset[id] = double.Parse(a.Element(Ns + "start").Element(Ns + "offsety").Value, CultureInfo.InvariantCulture);
                endOffset[id] = double.Parse(a.Element(Ns + "end").Element(Ns + "offsety").Value, CultureInfo.InvariantCulture);
                names[id] = a.Element(Ns + "name").Value;
            }

            var seams = new List<string>();
            int transitions = 0;
            foreach (XElement a in animations)
            {
                int from = (int)a.Attribute("id");
                foreach (XElement next in a.Descendants(Ns + "next"))
                {
                    int to = int.Parse(next.Value.Trim(), CultureInfo.InvariantCulture);
                    Assert.True(startOffset.ContainsKey(to), $"{names[from]} ({from}) points to missing animation {to}");
                    transitions++;
                    double jump = endOffset[from] - startOffset[to];
                    if (Math.Abs(jump) > 2)
                    {
                        seams.Add($"{names[from]} ({from}) -> {names[to]} ({to}): end {endOffset[from]} vs start {startOffset[to]}");
                    }
                }
            }

            Assert.True(transitions > 100, $"Expected more than 100 transitions, found {transitions}");
            Assert.Empty(seams);
        }
    }
}
