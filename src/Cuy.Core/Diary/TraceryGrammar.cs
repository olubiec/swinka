using System;
using System.Collections.Generic;
using System.Text;
using Newtonsoft.Json.Linq;

namespace Cuy.Core.Diary
{
    /// <summary>
    /// A small C# implementation of the Tracery grammar format (Kate Compton, https://github.com/galaxykate/tracery,
    /// Apache-2.0). Same JSON shape, so diary texts can be written and previewed in any Tracery editor:
    ///   { "origin": ["#greeting#, it is me, #name#!"], "greeting": ["Hello", "Hi"] }
    /// Supported: #symbol#, modifiers .capitalize .capitalizeAll .a .s .ed .lower,
    /// actions [key:value] / [key:#symbol#] (push, visible for the rest of the expansion), nested expansion.
    /// Facts from the game ({name}, {fed} ... in the old plan) are passed as symbols with one value: SetFact("name", "Kiwi").
    /// Deterministic for a given Random seed (tests). Pure, no I/O.
    /// </summary>
    public sealed class TraceryGrammar
    {
        private const int MaxDepth = 20;
        private readonly Dictionary<string, List<string>> _rules = new Dictionary<string, List<string>>(StringComparer.Ordinal);
        private readonly Dictionary<string, Stack<string>> _pushed = new Dictionary<string, Stack<string>>(StringComparer.Ordinal);

        public TraceryGrammar() { }

        public TraceryGrammar(IDictionary<string, string[]> rules)
        {
            foreach (var kv in rules) _rules[kv.Key] = new List<string>(kv.Value);
        }

        /// <summary>Loads a Tracery JSON object (values: array of strings or a single string).</summary>
        public static TraceryGrammar FromJson(string json)
        {
            var g = new TraceryGrammar();
            foreach (var prop in JObject.Parse(json).Properties())
            {
                var list = new List<string>();
                if (prop.Value is JArray arr) foreach (var t in arr) list.Add((string)t);
                else list.Add((string)prop.Value);
                g._rules[prop.Name] = list;
            }
            return g;
        }

        public bool HasSymbol(string name) { return _rules.ContainsKey(name); }

        public void SetRule(string symbol, params string[] options) { _rules[symbol] = new List<string>(options); }

        /// <summary>A game fact used by the texts, e.g. SetFact("fed", "3").</summary>
        public void SetFact(string symbol, string value) { _rules[symbol] = new List<string> { value ?? "" }; }

        public string Flatten(string rule, Random rng)
        {
            _pushed.Clear();
            return Expand(rule ?? "", rng, 0);
        }

        public string FlattenSymbol(string symbol, Random rng) { return Flatten("#" + symbol + "#", rng); }

        private string Expand(string text, Random rng, int depth)
        {
            if (depth > MaxDepth) return text;
            var sb = new StringBuilder(text.Length + 16);
            int i = 0;
            while (i < text.Length)
            {
                char c = text[i];
                if (c == '\\' && i + 1 < text.Length) { sb.Append(text[i + 1]); i += 2; continue; }
                if (c == '[')
                {
                    int end = FindClose(text, i, '[', ']');
                    if (end < 0) { sb.Append(c); i++; continue; }
                    RunAction(text.Substring(i + 1, end - i - 1), rng, depth);
                    i = end + 1;
                    continue;
                }
                if (c == '#')
                {
                    int end = FindTagEnd(text, i + 1);
                    if (end < 0) { sb.Append(c); i++; continue; }
                    sb.Append(ExpandTag(text.Substring(i + 1, end - i - 1), rng, depth));
                    i = end + 1;
                    continue;
                }
                sb.Append(c);
                i++;
            }
            return sb.ToString();
        }

        private string ExpandTag(string tag, Random rng, int depth)
        {
            // Inline actions inside a tag: #[hero:#name#]story#
            while (tag.StartsWith("[", StringComparison.Ordinal))
            {
                int end = FindClose(tag, 0, '[', ']');
                if (end < 0) break;
                RunAction(tag.Substring(1, end - 1), rng, depth);
                tag = tag.Substring(end + 1);
            }
            if (tag.Length == 0) return "";

            string[] parts = tag.Split('.');
            string value = Pick(parts[0], rng, depth);
            for (int m = 1; m < parts.Length; m++) value = Modify(value, parts[m]);
            return value;
        }

        private string Pick(string symbol, Random rng, int depth)
        {
            Stack<string> stack;
            if (_pushed.TryGetValue(symbol, out stack) && stack.Count > 0) return stack.Peek();
            List<string> options;
            if (!_rules.TryGetValue(symbol, out options) || options.Count == 0) return "((" + symbol + "))";
            return Expand(options[rng.Next(options.Count)], rng, depth + 1);
        }

        private void RunAction(string action, Random rng, int depth)
        {
            int colon = action.IndexOf(':');
            if (colon <= 0) return;
            string key = action.Substring(0, colon);
            string raw = action.Substring(colon + 1);
            if (raw == "POP")
            {
                Stack<string> s;
                if (_pushed.TryGetValue(key, out s) && s.Count > 0) s.Pop();
                return;
            }
            string value = Expand(raw, rng, depth + 1);
            Stack<string> stack;
            if (!_pushed.TryGetValue(key, out stack)) { stack = new Stack<string>(); _pushed[key] = stack; }
            stack.Push(value);
        }

        /// <summary>Closing '#' of a tag, skipping '#' inside [actions].</summary>
        private static int FindTagEnd(string s, int from)
        {
            int level = 0;
            for (int i = from; i < s.Length; i++)
            {
                if (s[i] == '[') level++;
                else if (s[i] == ']') level--;
                else if (s[i] == '#' && level == 0) return i;
            }
            return -1;
        }

        private static int FindClose(string s, int open, char o, char c)
        {
            int level = 0;
            for (int i = open; i < s.Length; i++)
            {
                if (s[i] == o) level++;
                else if (s[i] == c) { level--; if (level == 0) return i; }
            }
            return -1;
        }

        // ---- Base English modifiers (same names as Tracery's baseEngModifiers) ----

        private static string Modify(string s, string mod)
        {
            if (string.IsNullOrEmpty(s)) return s;
            switch (mod)
            {
                case "capitalize": return char.ToUpperInvariant(s[0]) + s.Substring(1);
                case "capitalizeAll": return CapitalizeAll(s);
                case "lower": return s.ToLowerInvariant();
                case "a": return (StartsWithVowelSound(s) ? "an " : "a ") + s;
                case "s": return Plural(s);
                case "ed": return Past(s);
                default: return s;
            }
        }

        private static string CapitalizeAll(string s)
        {
            var sb = new StringBuilder(s.Length);
            bool up = true;
            foreach (char ch in s)
            {
                sb.Append(up ? char.ToUpperInvariant(ch) : ch);
                up = !char.IsLetterOrDigit(ch);
            }
            return sb.ToString();
        }

        private static bool StartsWithVowelSound(string s)
        {
            char c = char.ToLowerInvariant(s[0]);
            if (s.StartsWith("uni", StringComparison.OrdinalIgnoreCase)) return false;
            if (s.StartsWith("hour", StringComparison.OrdinalIgnoreCase)) return true;
            return c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u';
        }

        private static bool IsConsonant(char c) { return "aeiou".IndexOf(char.ToLowerInvariant(c)) < 0; }

        private static string Plural(string s)
        {
            char last = s[s.Length - 1];
            if (last == 'y' && s.Length > 1 && IsConsonant(s[s.Length - 2])) return s.Substring(0, s.Length - 1) + "ies";
            if (last == 's' || last == 'x' || last == 'z' || s.EndsWith("ch", StringComparison.Ordinal) || s.EndsWith("sh", StringComparison.Ordinal))
                return s + "es";
            return s + "s";
        }

        private static string Past(string s)
        {
            char last = s[s.Length - 1];
            if (last == 'e') return s + "d";
            if (last == 'y' && s.Length > 1 && IsConsonant(s[s.Length - 2])) return s.Substring(0, s.Length - 1) + "ied";
            return s + "ed";
        }
    }
}
