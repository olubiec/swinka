using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Cuy.Core.Platform;
using Xunit;

namespace Cuy.Core.Tests
{
    public class UpdateCheckerTests
    {
        [Theory]
        [InlineData("1.1.0", "v1.2.0", true)]
        [InlineData("1.0.0", "1.0.0", false)]
        [InlineData("1.1.0", "1.0.0", false)]
        [InlineData("1.9.9", "2.0.0", true)]
        [InlineData("v1.0.0", "v1.0.1", true)]
        [InlineData("V1.0.0", "1.0.1", true)]
        [InlineData("1.0.0", "V1.0.0", false)]
        [InlineData("1.0.0", "1.0.1", true)]
        [InlineData("0.9.5", "1.0.0", true)]
        [InlineData("1.2.3.4", "1.2.3.5", true)]
        [InlineData("1.2.3.5", "1.2.3.4", false)]
        public void IsNewerVersion_BasicAndPrefix_ReturnsExpected(string current, string latest, bool expected)
        {
            var result = UpdateChecker.IsNewerVersion(current, latest);
            Assert.Equal(expected, result);
        }

        [Theory]
        [InlineData("", "1.0.0")]
        [InlineData("1.0.0", "")]
        [InlineData(null, "1.0.0")]
        [InlineData("1.0.0", null)]
        [InlineData("abc", "1.0.0")]
        [InlineData("1.0.0", "xyz")]
        [InlineData("1.0.0-", "1.0.0")]
        [InlineData("1..0", "1.0.0")]
        [InlineData("1.0.0.0.0", "1.0.0")]
        [InlineData("v", "1.0.0")]
        public void IsNewerVersion_Malformed_FailsSafely(string current, string latest)
        {
            Assert.False(UpdateChecker.IsNewerVersion(current, latest));
        }

        [Theory]
        // Release is newer than prerelease with same major.minor.patch
        [InlineData("1.0.0-beta", "1.0.0", true)]
        [InlineData("1.0.0", "1.0.0-beta", false)]
        // Prerelease comparisons
        [InlineData("1.0.0-alpha", "1.0.0-beta", true)]
        [InlineData("1.0.0-beta", "1.0.0-alpha", false)]
        [InlineData("1.0.0-beta.1", "1.0.0-beta.2", true)]
        [InlineData("1.0.0-beta.2", "1.0.0-beta.1", false)]
        // Numeric identifiers have lower precedence than non-numeric
        [InlineData("1.0.0-alpha.1", "1.0.0-alpha.beta", true)]
        // Different major/minor still takes precedence over prerelease
        [InlineData("1.0.0", "1.1.0-alpha", true)]
        [InlineData("2.0.0-alpha", "1.9.9", false)]
        public void IsNewerVersion_Prerelease_HandlesSemVerPrecedence(string current, string latest, bool expected)
        {
            var result = UpdateChecker.IsNewerVersion(current, latest);
            Assert.Equal(expected, result);
        }

        [Fact]
        public async Task CheckForUpdateAsync_ValidResponse_ParsesCorrectly()
        {
            UpdateChecker.ClearCache();

            var fakeJson = @"{
                ""tag_name"": ""v1.5.0"",
                ""body"": ""- New mini games\n- Bug fixes"",
                ""zipball_url"": ""https://github.com/olubiec/swinka/zipball/v1.5.0"",
                ""assets"": [
                    {
                        ""name"": ""cuy-v1.5.0.exe"",
                        ""browser_download_url"": ""https://github.com/olubiec/swinka/releases/download/v1.5.0/cuy-v1.5.0.exe""
                    },
                    {
                        ""name"": ""cuy-v1.5.0.zip"",
                        ""browser_download_url"": ""https://github.com/olubiec/swinka/releases/download/v1.5.0/cuy-v1.5.0.zip""
                    }
                ]
            }";

            var handler = new MockHttpMessageHandler(req =>
            {
                Assert.NotNull(req.Headers.UserAgent);
                Assert.Contains("Cuy-Pet", req.Headers.UserAgent.ToString());
                Assert.NotNull(req.RequestUri);
                Assert.Equal("https://api.github.com/repos/olubiec/swinka/releases/latest", req.RequestUri.ToString());
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(fakeJson)
                };
            });

            using (var client = new HttpClient(handler))
            {
                var update = await UpdateChecker.CheckForUpdateAsync("1.0.0", "olubiec/swinka", client);

                Assert.NotNull(update);
                Assert.Equal("v1.5.0", update.Version);
                Assert.Equal("https://github.com/olubiec/swinka/releases/download/v1.5.0/cuy-v1.5.0.zip", update.DownloadUrl);
                Assert.Equal("- New mini games\n- Bug fixes", update.ReleaseNotes);
                Assert.True(update.IsNewer);
            }
        }

        [Fact]
        public async Task CheckForUpdateAsync_NoZipAsset_FallsBackToZipball()
        {
            UpdateChecker.ClearCache();

            var fakeJson = @"{
                ""tag_name"": ""v1.2.0"",
                ""body"": ""Release 1.2"",
                ""zipball_url"": ""https://github.com/olubiec/swinka/zipball/v1.2.0"",
                ""assets"": []
            }";

            var handler = new MockHttpMessageHandler(req => new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(fakeJson)
            });

            using (var client = new HttpClient(handler))
            {
                var update = await UpdateChecker.CheckForUpdateAsync("1.2.0", "olubiec/swinka", client);

                Assert.NotNull(update);
                Assert.Equal("v1.2.0", update.Version);
                Assert.Equal("https://github.com/olubiec/swinka/zipball/v1.2.0", update.DownloadUrl);
                Assert.False(update.IsNewer);
            }
        }

        [Fact]
        public async Task CheckForUpdateAsync_Uses4HourCache()
        {
            UpdateChecker.ClearCache();

            var fakeJson = @"{
                ""tag_name"": ""v2.0.0"",
                ""body"": ""Major release"",
                ""zipball_url"": ""https://github.com/olubiec/swinka/zipball/v2.0.0"",
                ""assets"": []
            }";

            var handler = new MockHttpMessageHandler(req => new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(fakeJson)
            });

            using (var client = new HttpClient(handler))
            {
                // First call: makes network request
                var update1 = await UpdateChecker.CheckForUpdateAsync("1.0.0", "olubiec/swinka", client);
                Assert.NotNull(update1);
                Assert.Equal(1, handler.RequestCount);
                Assert.True(update1.IsNewer);

                // Second call within 4 hours: uses cache, no additional request
                var update2 = await UpdateChecker.CheckForUpdateAsync("2.0.0", "olubiec/swinka", client);
                Assert.NotNull(update2);
                Assert.Equal(1, handler.RequestCount);
                Assert.False(update2.IsNewer); // IsNewer is re-evaluated for currentVersion 2.0.0

                // Age the cache by 5 hours: triggers new network request
                UpdateChecker.LastCheckTimeUtc = DateTime.UtcNow - TimeSpan.FromHours(5);
                var update3 = await UpdateChecker.CheckForUpdateAsync("1.0.0", "olubiec/swinka", client);
                Assert.NotNull(update3);
                Assert.Equal(2, handler.RequestCount);

                // ClearCache explicitly: triggers new network request
                UpdateChecker.ClearCache();
                var update4 = await UpdateChecker.CheckForUpdateAsync("1.0.0", "olubiec/swinka", client);
                Assert.NotNull(update4);
                Assert.Equal(3, handler.RequestCount);
            }
        }

        [Fact]
        public async Task CheckForUpdateAsync_HttpError_ReturnsNullSafely()
        {
            UpdateChecker.ClearCache();

            var handler = new MockHttpMessageHandler(req => new HttpResponseMessage(HttpStatusCode.NotFound));

            using (var client = new HttpClient(handler))
            {
                var update = await UpdateChecker.CheckForUpdateAsync("1.0.0", "olubiec/swinka", client);
                Assert.Null(update);
            }
        }

        [Fact]
        public async Task CheckForUpdateAsync_MalformedJson_ReturnsNullSafely()
        {
            UpdateChecker.ClearCache();

            var handler = new MockHttpMessageHandler(req => new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("not valid json")
            });

            using (var client = new HttpClient(handler))
            {
                var update = await UpdateChecker.CheckForUpdateAsync("1.0.0", "olubiec/swinka", client);
                Assert.Null(update);
            }
        }

        private class MockHttpMessageHandler : HttpMessageHandler
        {
            private readonly Func<HttpRequestMessage, HttpResponseMessage> _handler;
            public int RequestCount { get; private set; }

            public MockHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> handler)
            {
                _handler = handler;
            }

            protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            {
                RequestCount++;
                return Task.FromResult(_handler(request));
            }
        }
    }
}
