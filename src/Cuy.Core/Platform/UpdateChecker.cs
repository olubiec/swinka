using System;
using System.Globalization;
using System.Net.Http;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.Platform
{
    public class UpdateInfo
    {
        public string Version { get; set; }
        public string DownloadUrl { get; set; }
        public string ReleaseNotes { get; set; }
        public bool IsNewer { get; set; }
    }

    public static class UpdateChecker
    {
        private static readonly HttpClient _sharedClient = new HttpClient();
        private static readonly object _cacheLock = new object();
        private static DateTime _lastCheckTimeUtc = DateTime.MinValue;
        private static string _cachedRepo;
        private static string _cachedTag;
        private static string _cachedDownloadUrl;
        private static string _cachedBody;

        public static readonly TimeSpan CacheDuration = TimeSpan.FromHours(4);

        public static DateTime LastCheckTimeUtc
        {
            get
            {
                lock (_cacheLock)
                {
                    return _lastCheckTimeUtc;
                }
            }
            set
            {
                lock (_cacheLock)
                {
                    _lastCheckTimeUtc = value;
                }
            }
        }

        public static void ClearCache()
        {
            lock (_cacheLock)
            {
                _lastCheckTimeUtc = DateTime.MinValue;
                _cachedRepo = null;
                _cachedTag = null;
                _cachedDownloadUrl = null;
                _cachedBody = null;
            }
        }

        public static bool IsNewerVersion(string currentVersion, string latestVersion)
        {
            if (string.IsNullOrWhiteSpace(currentVersion) || string.IsNullOrWhiteSpace(latestVersion))
                return false;

            SemVer current;
            SemVer latest;
            if (!TryParseSemVer(currentVersion, out current) ||
                !TryParseSemVer(latestVersion, out latest))
            {
                return false;
            }

            return CompareSemVer(latest, current) > 0;
        }

        public static async Task<UpdateInfo> CheckForUpdateAsync(string currentVersion, string repo = "olubiec/swinka", HttpClient client = null)
        {
            lock (_cacheLock)
            {
                if (string.Equals(_cachedRepo, repo, StringComparison.OrdinalIgnoreCase) &&
                    _cachedTag != null &&
                    (DateTime.UtcNow - _lastCheckTimeUtc) < CacheDuration)
                {
                    return new UpdateInfo
                    {
                        Version = _cachedTag,
                        DownloadUrl = _cachedDownloadUrl,
                        ReleaseNotes = _cachedBody,
                        IsNewer = IsNewerVersion(currentVersion, _cachedTag)
                    };
                }
            }

            var httpClient = client ?? _sharedClient;
            var url = string.Format("https://api.github.com/repos/{0}/releases/latest", repo);

            using (var request = new HttpRequestMessage(HttpMethod.Get, url))
            {
                request.Headers.UserAgent.ParseAdd("Cuy-Pet");
                request.Headers.Accept.ParseAdd("application/vnd.github.v3+json");

                try
                {
                    if (client != null && client.DefaultRequestHeaders.UserAgent.Count == 0)
                    {
                        client.DefaultRequestHeaders.UserAgent.ParseAdd("Cuy-Pet");
                    }
                }
                catch
                {
                    // Ignore if client headers are locked
                }

                HttpResponseMessage response;
                try
                {
                    response = await httpClient.SendAsync(request).ConfigureAwait(false);
                }
                catch (Exception)
                {
                    return null;
                }

                if (!response.IsSuccessStatusCode)
                {
                    return null;
                }

                string jsonString;
                try
                {
                    jsonString = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                }
                catch (Exception)
                {
                    return null;
                }

                JObject release;
                try
                {
                    release = JObject.Parse(jsonString);
                }
                catch (Exception)
                {
                    return null;
                }

                var tagName = (string)release["tag_name"];
                if (string.IsNullOrEmpty(tagName))
                {
                    return null;
                }

                var body = (string)release["body"] ?? string.Empty;

                string downloadUrl = null;
                var assets = release["assets"] as JArray;
                if (assets != null)
                {
                    foreach (var asset in assets)
                    {
                        var assetUrl = (string)asset["browser_download_url"];
                        var assetName = (string)asset["name"];
                        if ((assetUrl != null && assetUrl.EndsWith(".zip", StringComparison.OrdinalIgnoreCase)) ||
                            (assetName != null && assetName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase)))
                        {
                            downloadUrl = assetUrl;
                            break;
                        }
                    }
                }

                if (string.IsNullOrEmpty(downloadUrl))
                {
                    downloadUrl = (string)release["zipball_url"];
                }

                lock (_cacheLock)
                {
                    _lastCheckTimeUtc = DateTime.UtcNow;
                    _cachedRepo = repo;
                    _cachedTag = tagName;
                    _cachedDownloadUrl = downloadUrl;
                    _cachedBody = body;
                }

                return new UpdateInfo
                {
                    Version = tagName,
                    DownloadUrl = downloadUrl,
                    ReleaseNotes = body,
                    IsNewer = IsNewerVersion(currentVersion, tagName)
                };
            }
        }

        private struct SemVer
        {
            public int Major;
            public int Minor;
            public int Patch;
            public int Revision;
            public string PreRelease;
        }

        private static bool TryParseSemVer(string input, out SemVer semVer)
        {
            semVer = default(SemVer);
            if (string.IsNullOrWhiteSpace(input))
                return false;

            string s = input.Trim();
            if (s.StartsWith("v", StringComparison.OrdinalIgnoreCase))
            {
                s = s.Substring(1).Trim();
            }

            if (string.IsNullOrEmpty(s))
                return false;

            // Remove build metadata (+...)
            int plusIndex = s.IndexOf('+');
            if (plusIndex >= 0)
            {
                s = s.Substring(0, plusIndex);
            }

            // Extract prerelease (-...)
            string preRelease = null;
            int dashIndex = s.IndexOf('-');
            if (dashIndex >= 0)
            {
                preRelease = s.Substring(dashIndex + 1);
                s = s.Substring(0, dashIndex);
                if (string.IsNullOrEmpty(preRelease))
                    return false;
            }

            string[] parts = s.Split('.');
            if (parts.Length == 0 || parts.Length > 4)
                return false;

            int[] numbers = new int[4];
            for (int i = 0; i < parts.Length; i++)
            {
                if (string.IsNullOrEmpty(parts[i]))
                    return false;
                int num;
                if (!int.TryParse(parts[i], NumberStyles.None, CultureInfo.InvariantCulture, out num) || num < 0)
                    return false;
                numbers[i] = num;
            }

            semVer = new SemVer
            {
                Major = numbers[0],
                Minor = numbers[1],
                Patch = numbers[2],
                Revision = numbers[3],
                PreRelease = preRelease
            };
            return true;
        }

        private static int CompareSemVer(SemVer v1, SemVer v2)
        {
            if (v1.Major != v2.Major)
                return v1.Major.CompareTo(v2.Major);
            if (v1.Minor != v2.Minor)
                return v1.Minor.CompareTo(v2.Minor);
            if (v1.Patch != v2.Patch)
                return v1.Patch.CompareTo(v2.Patch);
            if (v1.Revision != v2.Revision)
                return v1.Revision.CompareTo(v2.Revision);

            if (v1.PreRelease == null && v2.PreRelease == null)
                return 0;
            if (v1.PreRelease == null && v2.PreRelease != null)
                return 1;
            if (v1.PreRelease != null && v2.PreRelease == null)
                return -1;

            return ComparePreReleaseIdentifiers(v1.PreRelease, v2.PreRelease);
        }

        private static int ComparePreReleaseIdentifiers(string pre1, string pre2)
        {
            var parts1 = pre1.Split('.');
            var parts2 = pre2.Split('.');
            int minLen = Math.Min(parts1.Length, parts2.Length);

            for (int i = 0; i < minLen; i++)
            {
                string p1 = parts1[i];
                string p2 = parts2[i];

                int num1;
                int num2;
                bool isNum1 = int.TryParse(p1, NumberStyles.None, CultureInfo.InvariantCulture, out num1);
                bool isNum2 = int.TryParse(p2, NumberStyles.None, CultureInfo.InvariantCulture, out num2);

                if (isNum1 && isNum2)
                {
                    int cmp = num1.CompareTo(num2);
                    if (cmp != 0) return cmp;
                }
                else if (isNum1 && !isNum2)
                {
                    return -1;
                }
                else if (!isNum1 && isNum2)
                {
                    return 1;
                }
                else
                {
                    int cmp = string.CompareOrdinal(p1, p2);
                    if (cmp != 0) return cmp;
                }
            }

            return parts1.Length.CompareTo(parts2.Length);
        }
    }
}
