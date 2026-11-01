using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using Xunit;

namespace Cuy.Core.Tests
{
    public class NoticesTests
    {
        private static string RepoFile(string relativePath)
        {
            string dir = AppContext.BaseDirectory;
            while (dir != null && !File.Exists(Path.Combine(dir, "Cuy.sln")))
            {
                dir = Directory.GetParent(dir)?.FullName;
            }
            if (dir == null) throw new InvalidOperationException("Could not find repository root containing Cuy.sln");
            return Path.Combine(dir, relativePath.Replace('/', Path.DirectorySeparatorChar));
        }

        [Fact]
        public void ThirdPartyNotices_ContainsAllPackagesFromCsprojFiles()
        {
            string noticesPath = RepoFile("THIRD_PARTY_NOTICES.md");
            Assert.True(File.Exists(noticesPath), "THIRD_PARTY_NOTICES.md must exist in repo root");
            string noticesContent = File.ReadAllText(noticesPath);

            string[] projectFiles = {
                RepoFile("src/Cuy/Cuy.csproj"),
                RepoFile("src/Cuy.Core/Cuy.Core.csproj")
            };

            var packageRegex = new Regex(@"<PackageReference\s+Include=""([^""]+)""", RegexOptions.IgnoreCase);
            var missing = new List<string>();

            foreach (var proj in projectFiles)
            {
                Assert.True(File.Exists(proj), $"Project file {proj} must exist");
                string projXml = File.ReadAllText(proj);
                var matches = packageRegex.Matches(projXml);

                foreach (Match m in matches)
                {
                    string packageId = m.Groups[1].Value.Trim();
                    if (noticesContent.IndexOf(packageId, StringComparison.OrdinalIgnoreCase) < 0)
                    {
                        missing.Add(packageId);
                    }
                }
            }

            Assert.True(missing.Count == 0, $"The following NuGet packages are missing from THIRD_PARTY_NOTICES.md: {string.Join(", ", missing)}");
        }
    }
}
